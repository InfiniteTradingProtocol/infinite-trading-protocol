// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import { IInfiniteSubaccount } from "./interfaces/IInfiniteSubaccount.sol";
import { IAggregatorV3, IInfiniteSubaccountFactory } from "./interfaces/IInfiniteSubaccountFactory.sol";
import { InfiniteSubaccount } from "./InfiniteSubaccount.sol";
import { InfiniteSwapSandbox } from "./InfiniteSwapSandbox.sol";

/// @title InfiniteSubaccountFactory
/// @notice Deploys and records Infinite Subaccounts, and holds the network-wide agent policy: price oracles, approved
///         routers, keepers, the fee schedule and the ITP fee discount tiers.
/// @dev Nothing here can move account funds or change account code. Changes that could hurt existing accounts wait:
///      a new oracle for an already listed asset waits ORACLE_DELAY, a new fee schedule waits FEE_DELAY, and fees are
///      capped at MAX_FEE_BPS of the trade. Listing a new asset, delisting, removing routers or keepers and pausing
/// take effect at once, because they only matter to accounts that opt in or they only stop agents.
contract InfiniteSubaccountFactory is IInfiniteSubaccountFactory, Ownable2Step {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint16 public constant BPS = 10_000;
    uint16 public constant MAX_FEE_BPS = 100; // 1% of the trade, whatever the schedule says
    uint256 public constant FEE_DELAY = 3 days;
    uint256 public constant ORACLE_DELAY = 2 days;
    uint256 public constant MAX_HEARTBEAT = 2 days;
    uint256 public constant SEQUENCER_GRACE = 1 hours;

    struct Asset {
        address feed; // Chainlink USD feed
        uint32 heartbeat; // max age of an answer
        uint8 tokenDecimals;
        uint8 feedDecimals;
        bool tradable;
    }

    struct PendingAsset {
        address feed;
        uint32 heartbeat;
        uint64 eta;
    }

    /// @dev Discount tiers are ascending ITP amounts locked in the account; the highest tier reached applies.
    ///      No minimum fee on purpose: keepers pay their own gas, and a minimum would let fee churn on small trades
    ///      cost more than `dailyLimitUsd * feeBps` a day.
    struct FeeSchedule {
        uint16 keeperFeeBps; // Infinite Trading keepers
        uint16 operatorFeeBps; // owner-added operators (the user's own bot)
        uint128[3] tierMinLocked;
        uint16[3] tierDiscountBps;
    }

    address public immutable implementation;
    address public immutable swapSandbox;
    address public immutable feeToken;
    address public immutable sequencerUptimeFeed; // address(0) on L1

    address public treasury;
    address public guardian;
    bool public keepersPaused;

    FeeSchedule private _fees;
    FeeSchedule private _pendingFees;
    uint64 public pendingFeesEta;

    mapping(address => Asset) public assets;
    mapping(address => PendingAsset) public pendingAssets;
    address[] private _listed;
    mapping(address => bool) public isApprovedRouter;
    mapping(address => uint64) public keeperExpiry;

    mapping(address => bool) public isAccount;
    mapping(address => address) public accountOwner;
    mapping(address => EnumerableSet.AddressSet) private _accountsOf;
    uint256 public accountCount;

    event AccountCreated(address indexed account, address indexed owner, bytes32 salt, address creator);
    event AccountOwnerSynced(address indexed account, address indexed previousOwner, address indexed newOwner);
    event AssetListed(address indexed token, address feed, uint32 heartbeat);
    event AssetUpdateQueued(address indexed token, address feed, uint32 heartbeat, uint64 eta);
    event AssetUpdateCancelled(address indexed token);
    event AssetDelisted(address indexed token);
    event RouterSet(address indexed router, bool approved);
    event KeeperSet(address indexed keeper, uint64 expiry);
    event KeepersPausedSet(bool paused, address indexed by);
    event GuardianSet(address indexed guardian);
    event TreasurySet(address indexed treasury);
    event FeesQueued(FeeSchedule schedule, uint64 eta);
    event FeesApplied(FeeSchedule schedule);
    event FeesCancelled();

    error ZeroAddress();
    error NotAuthorized();
    error NotOwnerOrGuardian();
    error NotAnAccount();
    error InvalidFees();
    error InvalidAsset();
    error InvalidRouter();
    error NotListed(address token);
    error StalePrice(address token);
    error SequencerDown();
    error NothingQueued();
    error TooEarly(uint64 eta);

    constructor(
        address owner_,
        address guardian_,
        address treasury_,
        address feeToken_,
        address sequencerUptimeFeed_,
        FeeSchedule memory fees_
    )
        Ownable(owner_)
    {
        if (treasury_ == address(0)) revert ZeroAddress();
        _validateFees(fees_);
        implementation = address(new InfiniteSubaccount());
        swapSandbox = address(new InfiniteSwapSandbox(address(this)));
        feeToken = feeToken_;
        sequencerUptimeFeed = sequencerUptimeFeed_;
        treasury = treasury_;
        guardian = guardian_;
        _fees = fees_;
        emit TreasurySet(treasury_);
        emit GuardianSet(guardian_);
        emit FeesApplied(fees_);
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Accounts
    // ----------------------------------------------------------------------------------------------------------------

    /// @notice Deploy an account for `owner_`. The owner, or an active keeper acting for them, may call this.
    ///         An account a keeper creates starts with agent access off: only the owner can grant it.
    /// @dev The CREATE2 salt includes the owner, so nobody can take an address predicted for someone else.
    function createAccount(
        address owner_,
        bytes32 salt,
        IInfiniteSubaccount.InitParams calldata params
    )
        external
        returns (address account)
    {
        if (msg.sender != owner_ && !isActiveKeeper(msg.sender)) revert NotAuthorized();
        account = Clones.cloneDeterministic(implementation, _salt(owner_, salt));
        isAccount[account] = true;
        accountOwner[account] = owner_;
        _accountsOf[owner_].add(account);
        ++accountCount;
        IInfiniteSubaccount(account).initialize(owner_, params, msg.sender == owner_);
        emit AccountCreated(account, owner_, salt, msg.sender);
    }

    function predictAccount(address owner_, bytes32 salt) external view returns (address) {
        return Clones.predictDeterministicAddress(implementation, _salt(owner_, salt));
    }

    /// @inheritdoc IInfiniteSubaccountFactory
    function syncOwner() external {
        if (!isAccount[msg.sender]) revert NotAnAccount();
        address previous = accountOwner[msg.sender];
        address next = IInfiniteSubaccount(msg.sender).owner();
        if (previous == next) return;
        _accountsOf[previous].remove(msg.sender);
        _accountsOf[next].add(msg.sender);
        accountOwner[msg.sender] = next;
        emit AccountOwnerSynced(msg.sender, previous, next);
    }

    function accountsOf(address owner_) external view returns (address[] memory) {
        return _accountsOf[owner_].values();
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Oracles and assets
    // ----------------------------------------------------------------------------------------------------------------

    /// @notice List `token` with a Chainlink USD feed. New assets list at once; a new feed for a listed (or delisted)
    ///         asset is queued for ORACLE_DELAY, so accounts that enabled it can react first.
    function listAsset(address token, address feed, uint32 heartbeat) external onlyOwner {
        if (token.code.length == 0 || feed.code.length == 0 || isApprovedRouter[token]) revert InvalidAsset();
        if (heartbeat == 0 || heartbeat > MAX_HEARTBEAT) revert InvalidAsset();
        if (IAggregatorV3(feed).decimals() > 18 || IERC20Metadata(token).decimals() > 18) revert InvalidAsset();

        if (assets[token].feed == address(0)) {
            _setAsset(token, feed, heartbeat);
            _listed.push(token);
            priceUsd(token); // the feed must answer now
            emit AssetListed(token, feed, heartbeat);
        } else {
            uint64 eta = uint64(block.timestamp + ORACLE_DELAY);
            pendingAssets[token] = PendingAsset({ feed: feed, heartbeat: heartbeat, eta: eta });
            emit AssetUpdateQueued(token, feed, heartbeat, eta);
        }
    }

    function applyAssetUpdate(address token) external {
        PendingAsset memory p = pendingAssets[token];
        if (p.eta == 0) revert NothingQueued();
        if (block.timestamp < p.eta) revert TooEarly(p.eta);
        delete pendingAssets[token];
        _setAsset(token, p.feed, p.heartbeat);
        priceUsd(token);
        emit AssetListed(token, p.feed, p.heartbeat);
    }

    function cancelAssetUpdate(address token) external onlyOwner {
        delete pendingAssets[token];
        emit AssetUpdateCancelled(token);
    }

    /// @notice Stop agent trading of `token` at once (bad feed, depeg, exploit). Owners can still withdraw it.
    function delistAsset(address token) external onlyOwner {
        assets[token].tradable = false;
        emit AssetDelisted(token);
    }

    function isTradableAsset(address token) external view returns (bool) {
        return assets[token].tradable;
    }

    function listedAssets() external view returns (address[] memory) {
        return _listed;
    }

    /// @notice USD price with 18 decimals; reverts on a stale or non-positive answer, or while the L2 sequencer is
    ///         down or within SEQUENCER_GRACE of restarting.
    function priceUsd(address token) public view returns (uint256) {
        Asset memory a = assets[token];
        if (!a.tradable) revert NotListed(token);
        _checkSequencer();
        (, int256 answer,, uint256 updatedAt,) = IAggregatorV3(a.feed).latestRoundData();
        if (answer <= 0 || updatedAt == 0 || updatedAt > block.timestamp || block.timestamp - updatedAt > a.heartbeat) {
            revert StalePrice(token);
        }
        return uint256(answer) * 10 ** (18 - a.feedDecimals);
    }

    function valueUsd(address token, uint256 amount) external view returns (uint256) {
        return Math.mulDiv(amount, priceUsd(token), 10 ** assets[token].tokenDecimals);
    }

    function amountForUsdUp(address token, uint256 usd) public view returns (uint256) {
        return Math.mulDiv(usd, 10 ** assets[token].tokenDecimals, priceUsd(token), Math.Rounding.Ceil);
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Routers, keepers, pause
    // ----------------------------------------------------------------------------------------------------------------

    function setRouter(address router, bool approved) external onlyOwner {
        if (approved && (router.code.length == 0 || assets[router].feed != address(0) || router == swapSandbox)) {
            revert InvalidRouter();
        }
        isApprovedRouter[router] = approved;
        emit RouterSet(router, approved);
    }

    /// @notice Authorise `keeper` until `expiry` (0 revokes). Keepers only act on accounts with agentEnabled.
    function setKeeper(address keeper, uint64 expiry) external onlyOwner {
        if (keeper == address(0)) revert ZeroAddress();
        keeperExpiry[keeper] = expiry;
        emit KeeperSet(keeper, expiry);
    }

    function isActiveKeeper(address keeper) public view returns (bool) {
        return keeperExpiry[keeper] > block.timestamp;
    }

    /// @notice Circuit breaker for every agent swap on every account. Guardian or owner; only the owner unpauses.
    function pauseKeepers() external {
        if (msg.sender != owner() && msg.sender != guardian) revert NotOwnerOrGuardian();
        keepersPaused = true;
        emit KeepersPausedSet(true, msg.sender);
    }

    function unpauseKeepers() external onlyOwner {
        keepersPaused = false;
        emit KeepersPausedSet(false, msg.sender);
    }

    function setGuardian(address guardian_) external onlyOwner {
        guardian = guardian_;
        emit GuardianSet(guardian_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Fees
    // ----------------------------------------------------------------------------------------------------------------

    function queueFees(FeeSchedule calldata schedule) external onlyOwner {
        _validateFees(schedule);
        _pendingFees = schedule;
        pendingFeesEta = uint64(block.timestamp + FEE_DELAY);
        emit FeesQueued(schedule, pendingFeesEta);
    }

    function applyFees() external {
        uint64 eta = pendingFeesEta;
        if (eta == 0) revert NothingQueued();
        if (block.timestamp < eta) revert TooEarly(eta);
        _fees = _pendingFees;
        delete _pendingFees;
        pendingFeesEta = 0;
        emit FeesApplied(_fees);
    }

    function cancelFees() external onlyOwner {
        delete _pendingFees;
        pendingFeesEta = 0;
        emit FeesCancelled();
    }

    function fees() external view returns (FeeSchedule memory) {
        return _fees;
    }

    function pendingFees() external view returns (FeeSchedule memory schedule, uint64 eta) {
        return (_pendingFees, pendingFeesEta);
    }

    /// @notice Discount for `account` from the ITP it has locked (0 on chains without ITP).
    function discountBps(address account) public view returns (uint16) {
        if (feeToken == address(0)) return 0;
        uint256 locked = IInfiniteSubaccount(account).discountableFeeToken();
        for (uint256 i = 3; i > 0; --i) {
            uint128 min = _fees.tierMinLocked[i - 1];
            if (min > 0 && locked >= min) return _fees.tierDiscountBps[i - 1];
        }
        return 0;
    }

    /// @inheritdoc IInfiniteSubaccountFactory
    function quoteFee(
        address account,
        address token,
        uint256 amount,
        uint256 usd,
        bool viaOperator
    )
        external
        view
        returns (uint256 fee, address treasury_)
    {
        treasury_ = treasury;
        uint256 bps = viaOperator ? _fees.operatorFeeBps : _fees.keeperFeeBps;
        if (bps == 0) return (0, treasury_);
        uint256 feeUsd = usd * bps * (BPS - discountBps(account)) / BPS / BPS;
        if (feeUsd == 0) return (0, treasury_);
        fee = Math.mulDiv(feeUsd, 10 ** assets[token].tokenDecimals, priceUsd(token));
        // Belt and braces: the schedule is already capped, this caps the converted amount too.
        uint256 cap = amount * MAX_FEE_BPS / BPS;
        if (fee > cap) fee = cap;
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Internal
    // ----------------------------------------------------------------------------------------------------------------

    function _salt(address owner_, bytes32 salt) private pure returns (bytes32) {
        return keccak256(abi.encode(owner_, salt));
    }

    function _setAsset(address token, address feed, uint32 heartbeat) private {
        assets[token] = Asset({
            feed: feed,
            heartbeat: heartbeat,
            tokenDecimals: IERC20Metadata(token).decimals(),
            feedDecimals: IAggregatorV3(feed).decimals(),
            tradable: true
        });
    }

    function _checkSequencer() private view {
        address feed = sequencerUptimeFeed;
        if (feed == address(0)) return;
        (, int256 answer, uint256 startedAt,,) = IAggregatorV3(feed).latestRoundData();
        // answer 0 = up, 1 = down; startedAt = when the current status began.
        if (answer != 0 || startedAt == 0 || block.timestamp - startedAt <= SEQUENCER_GRACE) revert SequencerDown();
    }

    function _validateFees(FeeSchedule memory f) private pure {
        if (f.keeperFeeBps > MAX_FEE_BPS || f.operatorFeeBps > MAX_FEE_BPS) revert InvalidFees();
        uint128 last;
        for (uint256 i; i < 3; ++i) {
            if (f.tierDiscountBps[i] > BPS) revert InvalidFees();
            if (f.tierMinLocked[i] == 0) {
                if (f.tierDiscountBps[i] != 0) revert InvalidFees();
                continue;
            }
            if (f.tierMinLocked[i] <= last) revert InvalidFees();
            last = f.tierMinLocked[i];
        }
    }
}
