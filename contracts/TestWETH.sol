// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestWETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {
        // Mint 1 million WETH to deployer for testing
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }
}
