// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Test, console} from "../../lib/forge-std/src/Test.sol";
import {CulturePass} from "../../src/CulturePass.sol";

contract CulturePassAdmin is Test {
    CulturePass public cPass;
    address ADMIN = makeAddr("admin");

    function setUp() public {
        cPass = new CulturePass(ADMIN);
    }

    function testRegisterVenueOnly() public {
        // Test adding a venue with valid parameters
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0x123),
            CulturePass.Category.Museum,
            1 ether,
            100
        );

        (uint256 venueId, string memory name, , , , , ) = cPass.s_venues(1);
        console.log(string.concat("Venue Name: ", name));
        assertEq(venueId, 1);
    }

    function testRegisterVenueInvalidWallet() public {
        // Test adding a venue with an invalid wallet address
        vm.expectRevert(CulturePass.CulturePass__invalidWalletAddress.selector);
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0),
            CulturePass.Category.Museum,
            1 ether,
            100
        );
    }

    function testRegisterVenueInvalidEntryPrice() public {
        // Test adding a venue with an invalid entry price
        vm.expectRevert(CulturePass.CulturePass__invalidEntryPrice.selector);
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0x123),
            CulturePass.Category.Museum,
            0,
            100
        );
    }

    function testRegisterVenueInvalidDailyCapacity() public {
        // Test adding a venue with an invalid daily capacity
        vm.expectRevert(CulturePass.CulturePass__invalidDailyCapacity.selector);
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0x123),
            CulturePass.Category.Museum,
            1 ether,
            0
        );
    }

    function testRegisterVenueInvalidName() public {
        // Test adding a venue with an invalid name
        vm.expectRevert(CulturePass.CulturePass__invalidName.selector);
        cPass.registerVenue(
            1,
            "",
            address(0x123),
            CulturePass.Category.Museum,
            1 ether,
            100
        );
    }

    function testRegisterVenueInvalidCategory() public {
        // Test adding a venue with an invalid category
        vm.expectRevert(CulturePass.CulturePass__falseCategory.selector);
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0x123),
            CulturePass.Category.None,
            1 ether,
            100
        );
    }

    function testRegisterVenueDuplicate() public {
        // Test adding a venue with a duplicate venue ID
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0x123),
            CulturePass.Category.Museum,
            1 ether,
            100
        );

        vm.expectRevert(CulturePass.CulturePass__venueAlreadyExists.selector);
        cPass.registerVenue(
            1,
            "Another Venue",
            address(0x124),
            CulturePass.Category.Theater,
            2 ether,
            50
        );
    }

    // This test proves that the openZeppelin Ownable modifier is working correctly, and only the owner can add venues. The rest of the tests are for validating the input parameters for adding a venue.
    function testRegisterVenueUnauthorized() public {
        // Test adding a venue from an unauthorized address
        vm.prank(address(0x456));
        vm.expectRevert();
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0x123),
            CulturePass.Category.Museum,
            1 ether,
            100
        );
    }

    function testRemoveVenue() public {
        // Test removing a venue
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0x123),
            CulturePass.Category.Museum,
            1 ether,
            100
        );

        cPass.removeVenue(1);
        (, , , , , , bool isActive) = cPass.s_venues(1);
        assertFalse(isActive);
    }

    function testRemoveVenueNotFound() public {
        // Test removing a venue that does not exist
        vm.expectRevert(CulturePass.CulturePass__venueNotFound.selector);
        cPass.removeVenue(999);
    }
}
