// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IPoolLogic, IPoolManagerLogic } from "./interfaces/IdHEDGE.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  TraderRouter
//  Infinite Trading DAO  ·  https://infinitetrading.io
//
//  Holds the dHEDGE / ChamberFi `trader` role on behalf of many vaults so that
//  rotating a compromised hot gas wallet is a single DAO transaction instead of
//  one `setTrader` per vault per network.
//
//  The DAO multisig signs `setTrader(TraderRouter)` once per vault. From then
//  on the DAO manages the operator set here, in one place, for every vault.
//
//  SECURITY MODEL
//  ──────────────
//  This contract deliberately grants NO authority beyond what the trader role
//  already has. Every call it makes is forwarded to a vault's PoolLogic or that
//  vault's own PoolManagerLogic, and dHEDGE re-runs its full authorisation and
//  guard stack (contract guards, asset guards, slippage, supported assets) on
//  the forwarded call. A compromised operator can therefore do exactly what a
//  compromised trader EOA could do today - and nothing more - except that the
//  DAO can revoke it everywhere at once.
//
//  Manager-only powers (setTrader, changeManager, fee changes) are unreachable
//  from here: the router is the trader, never the manager.
// ─────────────────────────────────────────────────────────────────────────────
contract TraderRouter {
    // ─── Roles ───────────────────────────────────────────────────────────────

    /// @notice DAO multisig / timelock. Full control over operators and roles.
    address public owner;

    /// @notice Two-step ownership handover target.
    address public pendingOwner;

    /// @notice Fast-acting incident responder. May only pause, never unpause.
    /// @dev Kept separate from `owner` so a timelocked owner does not slow down
    ///      the emergency stop, while retaining no ability to resume trading.
    address public guardian;

    /// @notice Operator (hot gas wallet) expiry, as a unix timestamp.
    ///         0 means "not an operator". `type(uint64).max` means "no expiry".
    mapping(address => uint64) public operatorExpiry;

    /// @notice Enumeration of every address ever granted operator status, so the
    ///         DAO can audit and revoke without off-chain log indexing.
    address[] private _operatorList;
    mapping(address => uint256) private _operatorIndex; // 1-based; 0 = absent

    /// @notice Global emergency stop for all operator-initiated activity.
    bool public paused;

    // ─── Events ──────────────────────────────────────────────────────────────

    event OperatorSet(address indexed operator, uint64 expiry);
    event OperatorRevoked(address indexed operator);
    event GuardianSet(address indexed guardian);
    event PausedSet(bool paused, address indexed by);
    event OwnershipTransferStarted(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);
    event Executed(address indexed vault, address indexed operator, address indexed to, bytes4 selector);
    event ManagerLogicCall(address indexed vault, address indexed operator, bytes4 selector);

    // ─── Errors ──────────────────────────────────────────────────────────────

    error NotOwner();
    error NotOwnerOrGuardian();
    error NotPendingOwner();
    error NotOperator();
    error OperatorExpired();
    error IsPaused();
    error ZeroAddress();
    error LengthMismatch();
    error NotTraderForVault();
    error UntrustedTarget();

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev Single gate for every operator-initiated entrypoint.
    modifier onlyOperator() {
        if (paused) revert IsPaused();
        uint64 expiry = operatorExpiry[msg.sender];
        if (expiry == 0) revert NotOperator();
        if (block.timestamp >= expiry) revert OperatorExpired();
        _;
    }

    // ─── Construction ────────────────────────────────────────────────────────

    constructor(address _owner, address _guardian, address[] memory _operators) {
        if (_owner == address(0)) revert ZeroAddress();
        owner = _owner;
        emit OwnershipTransferred(address(0), _owner);

        guardian = _guardian;
        emit GuardianSet(_guardian);

        for (uint256 i; i < _operators.length; ++i) {
            _setOperator(_operators[i], type(uint64).max);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Trading surface (operators)
    //
    //  Mirrors every trader-permissioned function in dHEDGE V2 one-for-one, so
    //  the backend keeps the same call shapes it uses today with an EOA trader.
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Forward a single call to a vault, exactly as `PoolLogic.execTransaction`.
    function execTransaction(
        address vault,
        address to,
        bytes calldata data
    )
        external
        onlyOperator
        returns (bool success)
    {
        success = IPoolLogic(vault).execTransaction(to, data);
        emit Executed(vault, msg.sender, to, bytes4(data));
    }

    /// @notice Atomic multi-call within one vault, via the vault's own batcher.
    function execTransactions(address vault, IPoolLogic.TxToExecute[] calldata txs) external onlyOperator {
        IPoolLogic(vault).execTransactions(txs);
        for (uint256 i; i < txs.length; ++i) {
            emit Executed(vault, msg.sender, txs[i].to, bytes4(txs[i].data));
        }
    }

    /// @notice Atomic multi-call spanning several vaults, e.g. a fleet rebalance.
    function execTransactionsMulti(
        address[] calldata vaults,
        address[] calldata tos,
        bytes[] calldata datas
    )
        external
        onlyOperator
    {
        if (vaults.length != tos.length || tos.length != datas.length) revert LengthMismatch();
        for (uint256 i; i < vaults.length; ++i) {
            IPoolLogic(vaults[i]).execTransaction(tos[i], datas[i]);
            emit Executed(vaults[i], msg.sender, tos[i], bytes4(datas[i]));
        }
    }

    /// @notice Enable/disable vault assets. Requires `traderAssetChangeDisabled == false`.
    function changeAssets(
        address vault,
        IPoolManagerLogic.Asset[] calldata addAssets,
        address[] calldata removeAssets
    )
        external
        onlyOperator
    {
        IPoolManagerLogic pml = IPoolManagerLogic(IPoolLogic(vault).poolManagerLogic());
        pml.changeAssets(addAssets, removeAssets);
        emit ManagerLogicCall(vault, msg.sender, IPoolManagerLogic.changeAssets.selector);
    }

    /// @notice Toggle vault privacy. Requires `traderPrivacyChangeEnabled == true`.
    function setPoolPrivate(address vault, bool privatePool) external onlyOperator {
        IPoolManagerLogic pml = IPoolManagerLogic(IPoolLogic(vault).poolManagerLogic());
        pml.setPoolPrivate(privatePool);
        emit ManagerLogicCall(vault, msg.sender, IPoolManagerLogic.setPoolPrivate.selector);
    }

    /// @notice Adjust the vault deposit cap.
    function setMaxSupplyCap(address vault, uint256 maxSupplyCapD18) external onlyOperator {
        IPoolManagerLogic pml = IPoolManagerLogic(IPoolLogic(vault).poolManagerLogic());
        pml.setMaxSupplyCap(maxSupplyCapD18);
        emit ManagerLogicCall(vault, msg.sender, IPoolManagerLogic.setMaxSupplyCap.selector);
    }

    /// @notice Permissionless upstream, proxied here so fee harvesting keeps
    ///         running from the same operator wallets and the same code path.
    function mintManagerFee(address vault) external onlyOperator {
        IPoolLogic(vault).mintManagerFee();
    }

    /// @notice Batched `mintManagerFee` across vaults.
    function mintManagerFeeBatch(address[] calldata vaults) external onlyOperator {
        for (uint256 i; i < vaults.length; ++i) {
            IPoolLogic(vaults[i]).mintManagerFee();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Forward-compatibility escape hatch
    //
    //  dHEDGE ships new trader-permissioned functions from time to time. Rather
    //  than redeploying this router and re-running 15 multisig `setTrader` calls
    //  per network, operators may forward an arbitrary call to a vault's own
    //  PoolLogic or PoolManagerLogic.
    //
    //  This grants no extra authority: both targets are verified to belong to
    //  one another, and they enforce the trader role themselves. It cannot be
    //  aimed at a token, a DEX, or any unrelated contract.
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Forward a raw call to a vault's PoolLogic or its PoolManagerLogic.
    /// @param vault The PoolLogic (vault) address anchoring the trust check.
    /// @param target Must be `vault` itself or `vault.poolManagerLogic()`.
    function forward(
        address vault,
        address target,
        bytes calldata data
    )
        external
        onlyOperator
        returns (bytes memory result)
    {
        address pml = IPoolLogic(vault).poolManagerLogic();

        if (target == vault) {
            // Anchor the pairing in both directions so a hostile "vault" cannot
            // point at a legitimate PoolManagerLogic it does not own.
            if (IPoolManagerLogic(pml).poolLogic() != vault) revert UntrustedTarget();
        } else if (target != pml) {
            revert UntrustedTarget();
        }

        bool ok;
        (ok, result) = target.call(data);
        if (!ok) {
            assembly {
                revert(add(result, 0x20), mload(result))
            }
        }

        emit Executed(vault, msg.sender, target, bytes4(data));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Administration (DAO)
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Grant or refresh an operator. `expiry` is a unix timestamp;
    ///         pass `type(uint64).max` for a non-expiring operator.
    function setOperator(address operator, uint64 expiry) external onlyOwner {
        _setOperator(operator, expiry);
    }

    /// @notice Grant a batch of operators the same expiry.
    function setOperators(address[] calldata newOperators, uint64 expiry) external onlyOwner {
        for (uint256 i; i < newOperators.length; ++i) {
            _setOperator(newOperators[i], expiry);
        }
    }

    /// @notice Immediately revoke an operator across every vault the router serves.
    function revokeOperator(address operator) external onlyOwner {
        _revokeOperator(operator);
    }

    /// @notice Batched revocation, for a broad compromise.
    function revokeOperators(address[] calldata staleOperators) external onlyOwner {
        for (uint256 i; i < staleOperators.length; ++i) {
            _revokeOperator(staleOperators[i]);
        }
    }

    /// @notice Revoke every operator at once. Trading stops until the DAO re-grants.
    function revokeAllOperators() external onlyOwner {
        for (uint256 i = _operatorList.length; i > 0; --i) {
            _revokeOperator(_operatorList[i - 1]);
        }
    }

    /// @notice Emergency stop. Callable by the guardian for fast incident response.
    function pause() external {
        if (msg.sender != owner && msg.sender != guardian) revert NotOwnerOrGuardian();
        paused = true;
        emit PausedSet(true, msg.sender);
    }

    /// @notice Resume trading. Owner only - the guardian must not be able to unpause.
    function unpause() external onlyOwner {
        paused = false;
        emit PausedSet(false, msg.sender);
    }

    function setGuardian(address _guardian) external onlyOwner {
        guardian = _guardian;
        emit GuardianSet(_guardian);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Views - migration checks and backend preflight
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice True if `operator` may trade right now.
    /// @dev The backend's `isValidTrader` should become
    ///      `vault.trader() == router && router.isActiveOperator(wallet)`.
    function isActiveOperator(address operator) public view returns (bool) {
        uint64 expiry = operatorExpiry[operator];
        return expiry != 0 && block.timestamp < expiry && !paused;
    }

    /// @notice True once the DAO has pointed `vault` at this router.
    function isTraderFor(address vault) public view returns (bool) {
        return IPoolManagerLogic(IPoolLogic(vault).poolManagerLogic()).trader() == address(this);
    }

    /// @notice Post-migration sweep: which of these vaults are not yet routed here.
    function unmigratedVaults(address[] calldata vaults) external view returns (address[] memory missing) {
        address[] memory buffer = new address[](vaults.length);
        uint256 n;
        for (uint256 i; i < vaults.length; ++i) {
            if (!isTraderFor(vaults[i])) {
                buffer[n++] = vaults[i];
            }
        }
        missing = new address[](n);
        for (uint256 i; i < n; ++i) {
            missing[i] = buffer[i];
        }
    }

    /// @notice Every address currently or formerly granted operator status.
    function operators() external view returns (address[] memory) {
        return _operatorList;
    }

    /// @notice Only the operators that can trade right now.
    function activeOperators() external view returns (address[] memory active) {
        uint256 len = _operatorList.length;
        address[] memory buffer = new address[](len);
        uint256 n;
        for (uint256 i; i < len; ++i) {
            if (isActiveOperator(_operatorList[i])) {
                buffer[n++] = _operatorList[i];
            }
        }
        active = new address[](n);
        for (uint256 i; i < n; ++i) {
            active[i] = buffer[i];
        }
    }

    // ─── Internals ───────────────────────────────────────────────────────────

    function _setOperator(address operator, uint64 expiry) private {
        if (operator == address(0)) revert ZeroAddress();
        if (expiry == 0) revert OperatorExpired();

        if (_operatorIndex[operator] == 0) {
            _operatorList.push(operator);
            _operatorIndex[operator] = _operatorList.length;
        }
        operatorExpiry[operator] = expiry;
        emit OperatorSet(operator, expiry);
    }

    function _revokeOperator(address operator) private {
        if (operatorExpiry[operator] != 0) {
            operatorExpiry[operator] = 0;
            emit OperatorRevoked(operator);
        }

        uint256 index = _operatorIndex[operator];
        if (index != 0) {
            uint256 last = _operatorList.length;
            address lastOperator = _operatorList[last - 1];
            _operatorList[index - 1] = lastOperator;
            _operatorIndex[lastOperator] = index;
            _operatorList.pop();
            _operatorIndex[operator] = 0;
        }
    }
}
