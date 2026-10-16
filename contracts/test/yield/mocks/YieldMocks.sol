// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRateReader} from "../../../src/yield/interfaces/IRateReader.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev ERC-4626 lending market mock: interest via `accrue`, optional liquidity cap and deposit pause.
contract MockLendingVault is ERC4626 {
    uint256 public liquidityCap = type(uint256).max;
    bool public depositsPaused;

    constructor(IERC20 asset_, string memory n) ERC20(n, n) ERC4626(asset_) {}

    function accrue(uint256 amount) external {
        MockUSDC(asset()).mint(address(this), amount);
    }

    function setLiquidityCap(uint256 cap) external {
        liquidityCap = cap;
    }

    function setDepositsPaused(bool p) external {
        depositsPaused = p;
    }

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        require(!depositsPaused, "deposits paused");
        super._deposit(caller, receiver, assets, shares);
    }

    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares)
        internal
        override
    {
        require(assets <= liquidityCap, "illiquid");
        super._withdraw(caller, receiver, owner, assets, shares);
    }
}

/// @dev Minimal Comet: supply balances accrue via `accrue`, and over-withdrawals *borrow* like the real Comet.
contract MockComet {
    address public immutable baseToken;
    mapping(address => int256) public principal;
    uint256 public supplyRatePerSecond;
    uint256 public utilization = 0.8e18;

    constructor(address _baseToken) {
        baseToken = _baseToken;
    }

    function supply(address asset, uint256 amount) external {
        require(asset == baseToken, "asset");
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        principal[msg.sender] += int256(amount);
    }

    function withdraw(address asset, uint256 amount) external {
        require(asset == baseToken, "asset");
        principal[msg.sender] -= int256(amount); // may go negative = borrow
        IERC20(asset).transfer(msg.sender, amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        int256 p = principal[account];
        return p > 0 ? uint256(p) : 0;
    }

    function borrowBalanceOf(address account) external view returns (uint256) {
        int256 p = principal[account];
        return p < 0 ? uint256(-p) : 0;
    }

    function accrue(address account, uint256 amount) external {
        MockUSDC(baseToken).mint(address(this), amount);
        principal[account] += int256(amount);
    }

    function setSupplyRatePerSecond(uint256 r) external {
        supplyRatePerSecond = r;
    }

    function getUtilization() external view returns (uint256) {
        return utilization;
    }

    function getSupplyRate(uint256) external view returns (uint64) {
        return uint64(supplyRatePerSecond);
    }
}

/// @dev Configurable rate oracle: per-target APR (WAD) with optional revert.
contract MockRateReader is IRateReader {
    mapping(address => uint256) public rate;
    mapping(address => bool) public broken;

    function setRate(address target, uint256 aprWad) external {
        rate[target] = aprWad;
    }

    function setBroken(address target, bool b) external {
        broken[target] = b;
    }

    function supplyRate(address target) external view returns (uint256) {
        require(!broken[target], "reader broken");
        return rate[target];
    }
}

contract NotAnAdapter {
    function parentVault() external pure returns (address) {
        return address(0xdead);
    }
}
