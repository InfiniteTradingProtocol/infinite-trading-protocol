
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ITP is ERC20, ERC20Burnable, ERC20Permit {
    constructor() ERC20("Infinite Trading Protocol", "ITP") ERC20Permit("Infinite Trading Protocol") {
        _mint(msg.sender, 1000000000 * 10 ** decimals());
    }
}

