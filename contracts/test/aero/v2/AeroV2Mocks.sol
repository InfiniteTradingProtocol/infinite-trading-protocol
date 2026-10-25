// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

contract V2Token is ERC20 {
    mapping(address => bool) public blocked;

    constructor(string memory s) ERC20(s, s) { }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function block_(address account, bool b) external {
        blocked[account] = b;
    }

    function _update(address from, address to, uint256 value) internal override {
        require(!blocked[to] && !blocked[from], "blocked");
        super._update(from, to, value);
    }
}

/// @dev Solidly-style volatile pool: x*y=k with fee, reserve cumulatives, mint/burn/swap, claimable fees.
contract V2PoolMock is ERC20 {
    address public token0;
    address public token1;
    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public blockTimestampLast;
    uint256 public c0;
    uint256 public c1;
    uint256 public feeBps = 30;
    uint256 public held0;
    uint256 public held1;
    bool public failClaims;
    mapping(address => uint256) public fees0;
    mapping(address => uint256) public fees1;

    constructor(address a, address b) ERC20("LP", "LP") {
        token0 = a;
        token1 = b;
    }

    function getReserves() external view returns (uint256, uint256, uint256) {
        return (reserve0, reserve1, blockTimestampLast);
    }

    function currentCumulativePrices() external view returns (uint256, uint256, uint256) {
        uint256 e = block.timestamp - blockTimestampLast;
        return (c0 + reserve0 * e, c1 + reserve1 * e, block.timestamp);
    }

    function _bal() private view returns (uint256 b0, uint256 b1) {
        b0 = ERC20(token0).balanceOf(address(this)) - held0;
        b1 = ERC20(token1).balanceOf(address(this)) - held1;
    }

    function _sync(uint256 b0, uint256 b1) private {
        uint256 e = block.timestamp - blockTimestampLast;
        if (e != 0 && reserve0 != 0) {
            c0 += reserve0 * e;
            c1 += reserve1 * e;
        }
        reserve0 = b0;
        reserve1 = b1;
        blockTimestampLast = block.timestamp;
    }

    function getAmountOut(uint256 amountIn, address tokenIn) public view returns (uint256) {
        (uint256 rin, uint256 rout) = tokenIn == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
        amountIn -= amountIn * feeBps / 10_000;
        return amountIn * rout / (rin + amountIn);
    }

    function mint(address to) external returns (uint256 liq) {
        (uint256 b0, uint256 b1) = _bal();
        uint256 a0 = b0 - reserve0;
        uint256 a1 = b1 - reserve1;
        uint256 ts = totalSupply();
        if (ts == 0) {
            liq = Math.sqrt(a0 * a1) - 1000;
            _mint(address(1), 1000);
        } else {
            liq = Math.min(a0 * ts / reserve0, a1 * ts / reserve1);
        }
        require(liq > 0, "liq");
        _mint(to, liq);
        _sync(b0, b1);
    }

    function burn(address to) external returns (uint256 a0, uint256 a1) {
        (uint256 b0, uint256 b1) = _bal();
        uint256 liq = balanceOf(address(this));
        uint256 ts = totalSupply();
        a0 = liq * b0 / ts;
        a1 = liq * b1 / ts;
        _burn(address(this), liq);
        ERC20(token0).transfer(to, a0);
        ERC20(token1).transfer(to, a1);
        _sync(b0 - a0, b1 - a1);
    }

    function swap(uint256 o0, uint256 o1, address to, bytes calldata) external {
        if (o0 != 0) ERC20(token0).transfer(to, o0);
        if (o1 != 0) ERC20(token1).transfer(to, o1);
        (uint256 b0, uint256 b1) = _bal();
        uint256 in0 = b0 > reserve0 - o0 ? b0 - (reserve0 - o0) : 0;
        uint256 in1 = b1 > reserve1 - o1 ? b1 - (reserve1 - o1) : 0;
        require(in0 > 0 || in1 > 0, "in");
        require((b0 - in0 * feeBps / 10_000) * (b1 - in1 * feeBps / 10_000) >= reserve0 * reserve1, "K");
        _sync(b0, b1);
    }

    /// @dev Test helper: credit claimable trading fees to `account` (tokens must be minted to this pool first).
    function addFees(address account, uint256 a, uint256 b) external {
        fees0[account] += a;
        fees1[account] += b;
        held0 += a;
        held1 += b;
    }

    function setFailClaims(bool f) external {
        failClaims = f;
    }

    function pendingFees(address account) external view returns (uint256, uint256) {
        return (fees0[account], fees1[account]);
    }

    function claimFees(address to) external returns (uint256 a, uint256 b) {
        require(!failClaims, "claim");
        a = fees0[msg.sender];
        b = fees1[msg.sender];
        fees0[msg.sender] = 0;
        fees1[msg.sender] = 0;
        held0 -= a;
        held1 -= b;
        if (a != 0) ERC20(token0).transfer(to, a);
        if (b != 0) ERC20(token1).transfer(to, b);
    }
}

contract V2PoolFactoryMock {
    mapping(address => bool) public isPool;

    function allow(address pool) external {
        isPool[pool] = true;
    }
}

contract V2GaugeFactoryMock {
    mapping(address => bool) public isGauge;
    mapping(address => address) public computeGaugeAddress;

    function register(address pool, address gauge) external {
        isGauge[gauge] = true;
        computeGaugeAddress[pool] = gauge;
    }
}

contract V2VoterMock {
    mapping(address => bool) public isActivated;

    function setActivated(address gauge, bool a) external {
        isActivated[gauge] = a;
    }
}

contract V2GaugeMock {
    address public stakingToken;
    address public voter;
    V2Token public reward;
    mapping(address => uint256) public balanceOf;
    uint256 public pendingReward;
    bool public failClaims;
    bool public failDeposits;

    constructor(address pool, address voter_, V2Token reward_) {
        stakingToken = pool;
        voter = voter_;
        reward = reward_;
    }

    function setReward(uint256 amount) external {
        pendingReward = amount;
    }

    function setFail(bool claims, bool deposits) external {
        failClaims = claims;
        failDeposits = deposits;
    }

    function earned(address) external view returns (uint256) {
        return pendingReward;
    }

    function deposit(uint256 amount) external {
        require(!failDeposits, "killed");
        ERC20(stakingToken).transferFrom(msg.sender, address(this), amount);
        balanceOf[msg.sender] += amount;
    }

    function withdraw(uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        ERC20(stakingToken).transfer(msg.sender, amount);
    }

    function claimEmissions(address, address to) external {
        require(!failClaims, "claim");
        uint256 r = pendingReward;
        pendingReward = 0;
        if (r != 0) reward.mint(to, r);
    }
}
