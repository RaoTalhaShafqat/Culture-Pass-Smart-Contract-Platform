// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {TicketToken} from "./TicketToken.sol";

/**
 * @title CulturePass contract for managing Admin, Visitor and Venue business logic.
 * @author Rao Talha Shafqat, Alp Oskay , Yusuf Arslan
 * @notice This contract allows the platform to manage the business logic for Admin, Visitor and Venue roles. It interacts with the TicketToken contract to mint and burn ERC1155 tokens representing tickets.
 * @dev Please follow the documentation for each function to understand the specific business logic implemented for each role. The contract defines functions for Admin to manage Venues and Events, for Visitors to purchase tickets, and for Venues to withdraw funds.
 */
contract CulturePass is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    /*Errors*/
    error CulturePass__invalidWalletAddress();
    error CulturePass__invalidEntryPrice();
    error CulturePass__invalidDailyCapacity();
    error CulturePass__invalidName();
    error CulturePass__venueAlreadyExists();
    error CulturePass__falseCategory();
    error CulturePass__venueNotFound();
    error CulturePass__invalidTier();
    error CulturePass__insufficientFunds();
    error CulturePass__passStillNOTExpired();
    error CulturePass__passExpired();
    error CulturePass__noActivePass();

    TicketToken public c_ticketToken;

    uint256 public s_exchangeRate;

    enum Category {
        None,
        Museum,
        Theater,
        Gallery,
        Heritage
    } //More categories can be added as needed

    enum Tier {
        None,
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
        uint256 monthlyTickets;
        uint256 priceETH;
        uint256 monthlyVisitCap;
    }

    struct UserPass {
        Tier tier;
        uint256 expiry;
    }

    //
    mapping(uint256 => Venue) public s_venues; // Whitelist of venues with their details
    mapping(Tier => PassTier) public s_passTiers; //List of pass tiers with their details
    mapping(address => UserPass) public s_userPasses; // Mapping of user addresses to their pass details
    mapping(address => mapping(uint256 => mapping(Category => uint256))) public s_categoryVisits; //user => month => category => visit count
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) public s_venueVisits; //user => month => venueId => visit count
    mapping(uint256 => mapping(uint256 => uint256)) public s_venueDailyVisits; //venueId => day => visit count
    mapping(address => uint256) public s_venueEarnings; // Mapping of venue addresses to their accumulated balances from ticket sales

    /**
     * @notice Constructor for the CulturePass contract.
     * @dev Rao Talha Shafqat - Initializes the contract. Until we don't have a proxy deployment setup, we can use the constructor to set up any necessary state variables. Once we switch to a proxy deployment, we will need to move this logic to an initializer function and disable the constructor.
     */
    constructor() {
        //_disableInitializers();//This is for later do not uncomment.
    }

    function initialize(address _ticketTokenAddress, address _initialOwner) external initializer {
        __Ownable_init(_initialOwner);
        c_ticketToken = TicketToken(_ticketTokenAddress);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /*Admin Functions*/

    /**
     * @notice Admin function to register a new venue on the platform.
     * @dev Rao Talha Shafqat -See the Venue struct for details on the parameters.
     */
    function registerVenue(
        uint256 _venueId,
        string memory _name,
        address _wallet,
        Category _category,
        uint256 _entryPrice,
        uint256 _dailyCapacity
    ) external onlyOwner {
        require(_wallet != address(0), CulturePass__invalidWalletAddress());
        require(_entryPrice > 0, CulturePass__invalidEntryPrice());
        require(_dailyCapacity > 0, CulturePass__invalidDailyCapacity());
        require(bytes(_name).length > 0, CulturePass__invalidName());
        require(_category != Category.None, CulturePass__falseCategory());
        require(s_venues[_venueId].wallet == address(0), CulturePass__venueAlreadyExists());

        s_venues[_venueId] = Venue({
            venueId: _venueId,
            name: _name,
            wallet: _wallet,
            category: _category,
            entryPrice: _entryPrice,
            dailyCapacity: _dailyCapacity,
            isActive: true
        });
    }

    /**
     * @notice Admin function to remove a venue from the platform.
     * @dev Rao Talha Shafqat - This function does not delete the venue from storage but marks it as inactive.
     */
    function removeVenue(uint256 _venueId) external onlyOwner {
        require(s_venues[_venueId].wallet != address(0), CulturePass__venueNotFound());
        s_venues[_venueId].isActive = false; //This is more gas efficient than deleting the venue from storage.
    }

    /**
     * @notice Admin function to set the ticket-to-ETH exchange rate.
     * @dev Rao Talha Shafqat - Maybe using Oracle here would be better for real-time exchange rates.
     */
    function setExchangeRate(uint256 _newRate) external onlyOwner {
        s_exchangeRate = _newRate;
    }

    /**
     * @notice Admin function to set the details of a pass tier.
     * @dev Rao Talha Shafqat - This function allows the admin to define different tiers of passes with varying benefits and prices.
     */
    function setPassTier(Tier _tier, uint256 _monthlyTickets, uint256 _priceETH, uint256 _monthlyVisitCap)
        external
        onlyOwner
    {
        require(_tier != Tier.None, CulturePass__invalidTier());
        s_passTiers[_tier] =
            PassTier({monthlyTickets: _monthlyTickets, priceETH: _priceETH, monthlyVisitCap: _monthlyVisitCap});
    }

    /*Visitor Functions*/
    /**
     * @notice Function for visitors to purchase a pass.
     * @dev Rao Talha Shafqat - This function allows users to buy a pass for a specific tier.
     */
    function purchasePass(Tier _tier) external payable {
        PassTier memory passTier = s_passTiers[_tier];
        require(msg.value == passTier.priceETH, CulturePass__insufficientFunds());
        UserPass memory userPass = s_userPasses[msg.sender];
        require(userPass.expiry < block.timestamp, CulturePass__passStillNOTExpired());
        c_ticketToken.mint(msg.sender, passTier.monthlyTickets);
        s_userPasses[msg.sender] = UserPass({tier: _tier, expiry: block.timestamp + 30 days});
    }

    /**
     * @notice Function for users to renew their pass.
     * @dev Rao Talha Shafqat - This function allows users to extend the validity of their existing pass of same Category if it has not expired yet.
     */
    function renewPass() external payable {
        UserPass memory userPass = s_userPasses[msg.sender];

        require(userPass.expiry != 0, CulturePass__noActivePass());
        require(block.timestamp < userPass.expiry, CulturePass__passExpired());
        require(msg.value == s_passTiers[userPass.tier].priceETH, CulturePass__insufficientFunds());
        c_ticketToken.mint(msg.sender, s_passTiers[userPass.tier].monthlyTickets);
        s_userPasses[msg.sender].expiry += 30 days; // Extend the expiry by another month
    }
    /*Venue Functions*/
}
