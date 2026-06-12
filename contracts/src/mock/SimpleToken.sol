// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract SimpleToken is ERC20Burnable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialMintValue
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialMintValue);
    }
}
