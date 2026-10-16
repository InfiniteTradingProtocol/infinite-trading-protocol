// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable2StepUpgradeable } from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { ReentrancyGuardTransient } from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

import { IAgentSeats } from "./interfaces/IAgentSeats.sol";
import { IItpPriceOracle } from "./interfaces/IItpPriceOracle.sol";

/// @title AgentSeats
/// @notice Per-agent memberships for Infinite Agents, paid in ITP. Deployed behind an ERC1967 (UUPS) proxy whose
///         owner — and upgrade authority — is the DAO Safe.
contract AgentSeats is
    IAgentSeats,
    Initializable,
    Ownable2StepUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardTransient
{
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;

    uint256 public constant MAX_SEATS_PER_TX = 25;
    uint16 public constant MAX_DAILY_RUNS_LIMIT = 96;
    uint64 public constant MAX_PLAN_DURATION = 366 days;

    /// @custom:storage-location erc7201:infinitetrading.storage.AgentSeats
    struct AgentSeatsStorage {
        IERC20 itp;
        address dao;
        IItpPriceOracle oracle;
        bool burnEnabled;
        uint16 maxDailyRuns;
        uint256 seatCount;
        mapping(uint8 planId => Plan) plans;
        mapping(uint256 seatId => Seat) seats;
        mapping(address owner => EnumerableSet.UintSet) ownerSeats;
    }

    // keccak256(abi.encode(uint256(keccak256("infinitetrading.storage.AgentSeats")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_LOCATION = 0xdb0913769ce36d75658594fd1260b2c5d5d7706f644d1cc142b23b5f2c41ea00;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @param initialPlans Index i configures plan id i + 1.
    function initialize(
        IERC20 itp_,
        address dao_,
        IItpPriceOracle oracle_,
        Plan[] calldata initialPlans
    )
        external
        initializer
    {
        if (address(itp_) == address(0) || dao_ == address(0) || address(oracle_) == address(0)) {
            revert ZeroAddress();
        }
        __Ownable_init(dao_);
        __Pausable_init();

        AgentSeatsStorage storage $ = _s();
        $.itp = itp_;
        $.dao = dao_;
        $.oracle = oracle_;
        $.burnEnabled = true;
        $.maxDailyRuns = 10;
        emit DaoUpdated(dao_);
        emit OracleUpdated(address(oracle_));
        emit BurnEnabledUpdated(true);
        emit MaxDailyRunsUpdated(10);

        for (uint256 i; i < initialPlans.length; ++i) {
            Plan calldata p = initialPlans[i];
            _setPlan(uint8(i + 1), p.duration, p.usdCents, p.active);
        }
    }

    // ================================================================= managers

    function buySeats(
        uint8 planId,
        uint256 quantity,
        uint256 maxItpIn
    )
        external
        nonReentrant
        whenNotPaused
        returns (uint256 firstSeatId)
    {
        return _buy(planId, quantity, maxItpIn);
    }

    function buySeatsWithPermit(
        uint8 planId,
        uint256 quantity,
        uint256 maxItpIn,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        external
        nonReentrant
        whenNotPaused
        returns (uint256 firstSeatId)
    {
        _permit(maxItpIn, deadline, v, r, s);
        return _buy(planId, quantity, maxItpIn);
    }

    function renewSeats(
        uint256[] calldata seatIds,
        uint8 planId,
        uint256 maxItpIn
    )
        external
        nonReentrant
        whenNotPaused
        returns (uint256 itpAmount)
    {
        return _renew(seatIds, planId, maxItpIn);
    }

    function renewSeatsWithPermit(
        uint256[] calldata seatIds,
        uint8 planId,
        uint256 maxItpIn,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        external
        nonReentrant
        whenNotPaused
        returns (uint256 itpAmount)
    {
        _permit(maxItpIn, deadline, v, r, s);
        return _renew(seatIds, planId, maxItpIn);
    }

    function setSeatsPaused(uint256[] calldata seatIds, bool paused_) external {
        AgentSeatsStorage storage $ = _s();
        for (uint256 i; i < seatIds.length; ++i) {
            Seat storage seat_ = _ownedSeat($, seatIds[i]);
            seat_.paused = paused_;
            emit SeatUpdated(seatIds[i], msg.sender, seat_.expiresAt, paused_);
        }
    }

    function transferSeats(uint256[] calldata seatIds, address to) external {
        if (to == address(0)) revert ZeroAddress();
        AgentSeatsStorage storage $ = _s();
        for (uint256 i; i < seatIds.length; ++i) {
            uint256 id = seatIds[i];
            Seat storage seat_ = _ownedSeat($, id);
            if (!$.ownerSeats[msg.sender].remove(id) || !$.ownerSeats[to].add(id)) revert TransferMismatch();
            seat_.owner = to;
            emit SeatUpdated(id, to, seat_.expiresAt, seat_.paused);
        }
    }

    function withdrawToDao() external nonReentrant returns (uint256 amount) {
        AgentSeatsStorage storage $ = _s();
        amount = $.itp.balanceOf(address(this));
        if (amount != 0) {
            $.itp.safeTransfer($.dao, amount);
            emit WithdrawnToDao($.dao, amount);
        }
    }

    // ==================================================================== views

    function itp() external view returns (address) {
        return address(_s().itp);
    }

    function dao() external view returns (address) {
        return _s().dao;
    }

    function oracle() external view returns (IItpPriceOracle) {
        return _s().oracle;
    }

    function burnEnabled() external view returns (bool) {
        return _s().burnEnabled;
    }

    function maxDailyRuns() external view returns (uint16) {
        return _s().maxDailyRuns;
    }

    function plan(uint8 planId) external view returns (Plan memory) {
        return _s().plans[planId];
    }

    function seat(uint256 seatId) external view returns (Seat memory) {
        return _s().seats[seatId];
    }

    function totalSeats() external view returns (uint256) {
        return _s().seatCount;
    }

    function seatsOf(address owner_) external view returns (uint256[] memory) {
        return _s().ownerSeats[owner_].values();
    }

    function seatBalance(address owner_) external view returns (uint256) {
        return _s().ownerSeats[owner_].length();
    }

    function isSeatActive(uint256 seatId) external view returns (bool) {
        Seat storage seat_ = _s().seats[seatId];
        return seat_.owner != address(0) && !seat_.paused && seat_.expiresAt > block.timestamp;
    }

    function quote(
        uint8 planId,
        uint256 quantity
    )
        public
        view
        returns (uint256 itpAmount, uint256 usdCents, uint256 itpUsdPrice)
    {
        AgentSeatsStorage storage $ = _s();
        Plan memory p = $.plans[planId];
        if (!p.active) revert InvalidPlan();
        if (quantity == 0 || quantity > MAX_SEATS_PER_TX) revert InvalidQuantity();
        itpUsdPrice = $.oracle.itpUsdPrice();
        if (itpUsdPrice == 0) revert InvalidPrice();
        usdCents = uint256(p.usdCents) * quantity;
        // cents → USD (1e-2) → 1e18 fixed point = cents * 1e16; ITP wei = usd1e18 * 1e18 / price1e18, rounded up.
        itpAmount = Math.mulDiv(usdCents * 1e16, 1e18, itpUsdPrice, Math.Rounding.Ceil);
    }

    // ============================================================== owner (DAO)

    function setPlan(uint8 planId, uint64 duration, uint64 usdCents, bool active) external onlyOwner {
        _setPlan(planId, duration, usdCents, active);
    }

    function setDao(address dao_) external onlyOwner {
        if (dao_ == address(0)) revert ZeroAddress();
        _s().dao = dao_;
        emit DaoUpdated(dao_);
    }

    function setOracle(IItpPriceOracle oracle_) external onlyOwner {
        if (address(oracle_) == address(0)) revert ZeroAddress();
        _s().oracle = oracle_;
        emit OracleUpdated(address(oracle_));
    }

    function setBurnEnabled(bool enabled) external onlyOwner {
        _s().burnEnabled = enabled;
        emit BurnEnabledUpdated(enabled);
    }

    function setMaxDailyRuns(uint16 runs) external onlyOwner {
        if (runs == 0 || runs > MAX_DAILY_RUNS_LIMIT) revert InvalidRuns();
        _s().maxDailyRuns = runs;
        emit MaxDailyRunsUpdated(runs);
    }

    function recoverToken(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(_s().itp)) revert CannotRecoverItp();
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
        emit TokensRecovered(token, to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ================================================================= internal

    function _buy(uint8 planId, uint256 quantity, uint256 maxItpIn) private returns (uint256 firstSeatId) {
        AgentSeatsStorage storage $ = _s();
        uint64 duration = $.plans[planId].duration;
        _collect(planId, quantity, maxItpIn);

        uint64 expiresAt = uint64(block.timestamp) + duration;
        firstSeatId = $.seatCount + 1;
        $.seatCount += quantity;
        for (uint256 id = firstSeatId; id < firstSeatId + quantity; ++id) {
            $.seats[id] = Seat({ owner: msg.sender, expiresAt: expiresAt, paused: false });
            $.ownerSeats[msg.sender].add(id);
            emit SeatUpdated(id, msg.sender, expiresAt, false);
        }
    }

    function _renew(uint256[] calldata seatIds, uint8 planId, uint256 maxItpIn) private returns (uint256 itpAmount) {
        AgentSeatsStorage storage $ = _s();
        uint64 duration = $.plans[planId].duration;
        itpAmount = _collect(planId, seatIds.length, maxItpIn);

        for (uint256 i; i < seatIds.length; ++i) {
            Seat storage seat_ = $.seats[seatIds[i]];
            if (seat_.owner == address(0)) revert UnknownSeat(seatIds[i]);
            uint64 start = seat_.expiresAt > block.timestamp ? seat_.expiresAt : uint64(block.timestamp);
            seat_.expiresAt = start + duration;
            emit SeatUpdated(seatIds[i], seat_.owner, seat_.expiresAt, seat_.paused);
        }
    }

    function _collect(uint8 planId, uint256 quantity, uint256 maxItpIn) private returns (uint256 itpAmount) {
        AgentSeatsStorage storage $ = _s();
        uint256 usdCents;
        uint256 price;
        (itpAmount, usdCents, price) = quote(planId, quantity);
        if (itpAmount > maxItpIn) revert SlippageExceeded(itpAmount, maxItpIn);

        IERC20 token = $.itp;
        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), itpAmount);
        if (token.balanceOf(address(this)) - before != itpAmount) revert TransferAmountMismatch();

        bool burned = $.burnEnabled;
        if (burned) ERC20Burnable(address(token)).burn(itpAmount);
        emit Payment(msg.sender, planId, quantity, usdCents, itpAmount, price, burned);
    }

    /// @dev A front-run permit only consumes the nonce, so failure is tolerated when allowance already suffices.
    function _permit(uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) private {
        IERC20 token = _s().itp;
        try IERC20Permit(address(token)).permit(msg.sender, address(this), value, deadline, v, r, s) { } catch { }
    }

    function _ownedSeat(AgentSeatsStorage storage $, uint256 seatId) private view returns (Seat storage seat_) {
        seat_ = $.seats[seatId];
        if (seat_.owner == address(0)) revert UnknownSeat(seatId);
        if (seat_.owner != msg.sender) revert NotSeatOwner(seatId);
    }

    function _setPlan(uint8 planId, uint64 duration, uint64 usdCents, bool active) private {
        if (planId == 0 || duration == 0 || duration > MAX_PLAN_DURATION || usdCents == 0) revert InvalidPlan();
        _s().plans[planId] = Plan({ duration: duration, usdCents: usdCents, active: active });
        emit PlanUpdated(planId, duration, usdCents, active);
    }

    function _authorizeUpgrade(address) internal override onlyOwner { }

    function _s() private pure returns (AgentSeatsStorage storage $) {
        assembly {
            $.slot := STORAGE_LOCATION
        }
    }
}
