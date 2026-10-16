// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IItpPriceOracle } from "./IItpPriceOracle.sol";

/// @notice Infinite Agents seats. One seat entitles its owner (the manager wallet) to run one agent until
///         `expiresAt`. Seats are bought and renewed in ITP priced in USD through `oracle()`. The Infinite Trading API
///         reads seat state and enforces run limits off-chain (`maxDailyRuns()` per seat per day); no recurring
///         on-chain transaction is ever required.
interface IAgentSeats {
    struct Plan {
        uint64 duration;
        uint64 usdCents;
        bool active;
    }

    struct Seat {
        address owner;
        uint64 expiresAt;
        bool paused;
    }

    /// @notice Single source of truth for indexers: emitted whenever a seat is created, renewed, paused, resumed or
    ///         transferred.
    event SeatUpdated(uint256 indexed seatId, address indexed owner, uint64 expiresAt, bool paused);
    event Payment(
        address indexed payer,
        uint8 indexed planId,
        uint256 seatCount,
        uint256 usdCents,
        uint256 itpAmount,
        uint256 itpUsdPrice,
        bool burned
    );
    event PlanUpdated(uint8 indexed planId, uint64 duration, uint64 usdCents, bool active);
    event DaoUpdated(address dao);
    event OracleUpdated(address oracle);
    event BurnEnabledUpdated(bool enabled);
    event MaxDailyRunsUpdated(uint16 runs);
    event WithdrawnToDao(address indexed dao, uint256 amount);
    event TokensRecovered(address indexed token, address indexed to, uint256 amount);

    error ZeroAddress();
    error InvalidPlan();
    error InvalidQuantity();
    error InvalidPrice();
    error SlippageExceeded(uint256 itpAmount, uint256 maxItpIn);
    error UnknownSeat(uint256 seatId);
    error NotSeatOwner(uint256 seatId);
    error TransferMismatch();
    error CannotRecoverItp();
    error InvalidRuns();
    error TransferAmountMismatch();

    // ------------------------------------------------------------------ managers

    function buySeats(uint8 planId, uint256 quantity, uint256 maxItpIn) external returns (uint256 firstSeatId);

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
        returns (uint256 firstSeatId);

    /// @notice Anyone may pay to renew any existing seat; time stacks onto unexpired seats.
    function renewSeats(uint256[] calldata seatIds, uint8 planId, uint256 maxItpIn) external returns (uint256 itpAmount);

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
        returns (uint256 itpAmount);

    /// @notice Seat owner only. The API skips paused seats. Paused time is not refunded or frozen.
    function setSeatsPaused(uint256[] calldata seatIds, bool paused) external;

    /// @notice Seat owner only. Moves seats to another manager wallet.
    function transferSeats(uint256[] calldata seatIds, address to) external;

    /// @notice Permissionless: sends every ITP held (only accrues while burning is off) to the DAO.
    function withdrawToDao() external returns (uint256 amount);

    // --------------------------------------------------------------------- views

    function itp() external view returns (address);
    function dao() external view returns (address);
    function oracle() external view returns (IItpPriceOracle);
    function burnEnabled() external view returns (bool);
    function maxDailyRuns() external view returns (uint16);
    function plan(uint8 planId) external view returns (Plan memory);
    function seat(uint256 seatId) external view returns (Seat memory);
    function totalSeats() external view returns (uint256);
    function seatsOf(address owner) external view returns (uint256[] memory);
    function seatBalance(address owner) external view returns (uint256);
    function isSeatActive(uint256 seatId) external view returns (bool);

    /// @return itpAmount ITP wei charged for `quantity` seats of `planId` right now (rounded up).
    function quote(
        uint8 planId,
        uint256 quantity
    )
        external
        view
        returns (uint256 itpAmount, uint256 usdCents, uint256 itpUsdPrice);

    // --------------------------------------------------------------- owner (DAO)

    function setPlan(uint8 planId, uint64 duration, uint64 usdCents, bool active) external;
    function setDao(address dao) external;
    function setOracle(IItpPriceOracle oracle) external;
    function setBurnEnabled(bool enabled) external;
    function setMaxDailyRuns(uint16 runs) external;
    function recoverToken(address token, address to, uint256 amount) external;
    function pause() external;
    function unpause() external;
}
