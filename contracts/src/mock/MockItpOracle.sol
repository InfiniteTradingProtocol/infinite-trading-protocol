// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { IItpPriceOracle } from "../interfaces/IItpPriceOracle.sol";

contract MockItpOracle is IItpPriceOracle {
    uint256 public price;

    constructor(uint256 price_) {
        price = price_;
    }

    function setPrice(uint256 price_) external {
        price = price_;
    }

    function itpUsdPrice() external view returns (uint256) {
        return price;
    }
}
