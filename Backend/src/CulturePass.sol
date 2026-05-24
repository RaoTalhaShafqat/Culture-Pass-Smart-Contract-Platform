// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TicketToken.sol";

/**
 * @title CulturePass contract for managing Admin, Visitor and Venue business logic.
 * @author Rao Talha Shafqat, Alp Oskay , Yusuf Arslan
 * @notice This contract allows the platform to manage the business logic for Admin, Visitor and Venue roles. It interacts with the TicketToken contract to mint and burn ERC1155 tokens representing tickets.
 * @dev Please follow the documentation for each function to understand the specific business logic implemented for each role. The contract defines functions for Admin to manage Venues and Events, for Visitors to purchase tickets, and for Venues to withdraw funds.
 */
contract CulturePass is Ownable {
    TicketToken public c_ticketToken;

    uint256 public s_exchangeRate;

    enum Category {
        Museum,
        Theater,
        Gallery,
        Heritage
    } //More categories can be added as needed

    enum Tier {
        Explorer,
        Enthusiast,
        Patron
    } //More tiers can be added as needed

    struct Venue {
        uint256 venueId;
        string name;
        address wallet;
        Category category;
        uint256 entryPrice;
        uint256 dailyCapacity;
        bool isActive;
    }

    struct PassTier {
        Tier tier;
        uint256 expiry;
        bool isActive;
    }

    struct UserPass {
        Tier tier;
        uint256 expiry;
        bool isActive;
    }

    //
    mapping(uint256 => Venue) public s_venues; // Whitelist of venues with their details
    mapping(Tier => PassTier) public s_passTiers; //List of pass tiers with their details
    mapping(address => UserPass) public s_userPasses; // Mapping of user addresses to their pass details
    mapping(address => mapping(uint256 => mapping(Category => uint256))) public s_categoryVisits; //user => month => category => visit count
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) public s_venueVisits; //user => month => venueId => visit count
    mapping(uint256 => mapping(uint256 => uint256)) public s_venueDailyVisits; //venueId => day => visit count
    mapping(address => uint256) public s_venueEarnings; // Mapping of venue addresses to their accumulated balances from ticket sales

    constructor(address _ticketTokenAddress) Ownable(msg.sender) {
        c_ticketToken = TicketToken(_ticketTokenAddress);
    }

    /*Admin Functions*/

    /*Visitor Functions*/

    /*Venue Functions*/
}
