//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TicketToken contract for minting ERC1155 tokens representing tickets.
 * @author Rao Talha Shafqat
 * @notice This contract allows the Culture Pass Address to mint & burn ERC1155 tokens representing tickets.
 * @dev A simple ERC1155 token inheriting from OpenZeppelin's ERC1155 and Ownable contracts. The contract defines a single token type (TICKET) with ID 0.
 */
contract TicketToken is ERC1155, Ownable {
    /*Errors*/
    error TicketToken__Unauthorized();

    uint256 private constant TICKET = 0;
    address private culturePassAddress;

    /*Modifiers*/
    modifier onlyCulturePass() {
        if (msg.sender != culturePassAddress) {
            revert TicketToken__Unauthorized();
        }
        _;
    }

    constructor() ERC1155("") Ownable(msg.sender) {}

    function setCulturePassAddress(address _culturePassAddress) external onlyOwner {
        culturePassAddress = _culturePassAddress;
    }

    function mint(address to, uint256 amount) external onlyCulturePass {
        _mint(to, TICKET, amount, "");
    }

    function burn(address from, uint256 amount) external onlyCulturePass {
        _burn(from, TICKET, amount);
    }

    /*View Functions & Pure functions including Getter Functions*/
    function getCulturePassAddress() external view returns (address) {
        return culturePassAddress;
    }
}
