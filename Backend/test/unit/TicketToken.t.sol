// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test, console} from "../../lib/forge-std/src/Test.sol";
import {TicketToken} from "../../src/TicketToken.sol";
import {DeployTicketToken} from "../../script/DeployTicketToken.s.sol";

/**
 * @title TicketTokenTest contract for testing the TicketToken contract.
 * @author Rao Talha Shafqat
 * @notice This contract tests the functionality of the TicketToken contract, including minting and burning tickets, and access control.
 * @dev This contract uses Foundry's Test framework to test the TicketToken contract. It includes tests for minting and burning tickets, as well as access control to ensure only the Culture Pass Address can mint and burn tickets.
 */
contract TicketTokenTest is Test {
    TicketToken public ticketToken;
    address ADMIN = makeAddr("admin");
    address USER = makeAddr("PassOwner");

    function setUp() external {
        DeployTicketToken deployer = new DeployTicketToken();
        ticketToken = deployer.run();
        vm.prank(msg.sender);
        ticketToken.setCulturePassAddress(ADMIN);
    }

    function testSettingCulturePassAddress() external view {
        console.log(msg.sender);
        console.log(ticketToken.owner());
        assertEq(ticketToken.getCulturePassAddress(), ADMIN);
    }

    function testSettingCulturePassAddressUnauthorized() external {
        vm.prank(USER);
        vm.expectRevert();
        ticketToken.setCulturePassAddress(ADMIN);
    }

    function testMintingTickets() external {
        vm.prank(ADMIN);
        ticketToken.mint(USER, 5);
        assertEq(ticketToken.balanceOf(USER, 0), 5);
    }

    function testMintingTicketsUnauthorized() external {
        vm.prank(USER);
        vm.expectRevert();
        ticketToken.mint(USER, 5);
    }

    function testBurningTickets() external {
        vm.startPrank(ADMIN);
        ticketToken.mint(USER, 5);
        ticketToken.burn(USER, 3);
        vm.stopPrank();
        assertEq(ticketToken.balanceOf(USER, 0), 2);
    }

    function testBurningTicketsUnauthorized() external {
        vm.prank(address(this));
        vm.expectRevert();
        ticketToken.burn(USER, 1);
    }
}
