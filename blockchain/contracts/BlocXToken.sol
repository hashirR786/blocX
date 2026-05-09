// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlocXToken is ERC20, Ownable {
    // Address of the social contract authorized to mint tokens as rewards
    address public socialContract;

    constructor() ERC20("BlocX Token", "BLOCX") Ownable(msg.sender) {}

    function setSocialContract(address _socialContract) external onlyOwner {
        socialContract = _socialContract;
    }

    // Only the owner or the authorized social contract can mint new tokens
    function mint(address to, uint256 amount) external {
        require(msg.sender == owner() || msg.sender == socialContract, "Not authorized to mint");
        _mint(to, amount);
    }
}
