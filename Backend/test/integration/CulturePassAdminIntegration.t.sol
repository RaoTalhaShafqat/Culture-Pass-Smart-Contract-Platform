// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";

import {CulturePass} from "../../src/CulturePass.sol";
import {TicketToken} from "../../src/TicketToken.sol";

import {MockSafe} from "../mocks/MockSafe.sol";
import {DeployCulturePass} from "../../script/DeployCulturePass.s.sol";
import {HelperConfig, CodeConstants} from "../../script/HelperConfig.sol";

contract CulturePassAdminIntegration is Test, CodeConstants {
    CulturePass public cPass;
    TicketToken public ticketToken;
    MockSafe public safe;

    address owner1 = makeAddr("owner1");
    address owner2 = makeAddr("owner2");

    function setUp() public {
        if (block.chainid == ANVIL_CHAIN_ID) {
            address[] memory owners = new address[](2);
            owners[0] = owner1;
            owners[1] = owner2;

            safe = new MockSafe(owners);
        } else {
            //Here actual sepolia safe.
        }

        HelperConfig config = new HelperConfig(address(safe));
        address safeAddr = config.activeConfig();

        DeployCulturePass deployer = new DeployCulturePass();
        (cPass, ticketToken) = deployer.run(safeAddr);
    }

    function _exec(bytes memory data) internal {
        vm.prank(owner1);
        uint256 txId = safe.submitTx(address(cPass), 0, data);

        vm.prank(owner1);
        safe.approveTx(txId);

        vm.prank(owner2);
        safe.approveTx(txId);

        vm.prank(owner1);
        safe.executeTx(txId);
    }

    function _execExpectFail(bytes memory data, bytes4 expectedRevert) internal {
        vm.prank(owner1);
        uint256 txId = safe.submitTx(address(cPass), 0, data);

        vm.prank(owner1);
        safe.approveTx(txId);

        vm.prank(owner2);
        safe.approveTx(txId);

        vm.expectRevert(expectedRevert);
        vm.prank(owner1);
        safe.executeTx(txId);
    }

    function testRegisterVenueOnly() public {
        bytes memory data = abi.encodeCall(
            CulturePass.registerVenue, (1, "Louvre Museum", address(0x123), CulturePass.Category.Museum, 1 ether, 100)
        );

        _exec(data);

        (uint256 venueId, string memory name,,,,,) = cPass.s_venues(1);

        assertEq(venueId, 1);
        assertEq(name, "Louvre Museum");
    }

    function testRegisterVenueInvalidWallet() public {
        bytes memory data = abi.encodeCall(
            CulturePass.registerVenue, (1, "Louvre Museum", address(0), CulturePass.Category.Museum, 1 ether, 100)
        );

        _execExpectFail(data, CulturePass.CulturePass__invalidWalletAddress.selector);
    }

    function testRegisterVenueInvalidEntryPrice() public {
        bytes memory data = abi.encodeCall(
            CulturePass.registerVenue, (1, "Louvre Museum", address(0x123), CulturePass.Category.Museum, 0, 100)
        );

        _execExpectFail(data, CulturePass.CulturePass__invalidEntryPrice.selector);
    }

    function testRegisterVenueDuplicate() public {
        bytes memory data = abi.encodeCall(
            CulturePass.registerVenue, (1, "Louvre Museum", address(0x123), CulturePass.Category.Museum, 1 ether, 100)
        );

        _exec(data);

        _execExpectFail(data, CulturePass.CulturePass__venueAlreadyExists.selector);
    }

    function testRemoveVenue() public {
        bytes memory add = abi.encodeCall(
            CulturePass.registerVenue, (1, "Louvre Museum", address(0x123), CulturePass.Category.Museum, 1 ether, 100)
        );

        _exec(add);

        bytes memory remove = abi.encodeCall(CulturePass.removeVenue, (1));

        _exec(remove);

        (,,,,,, bool isActive) = cPass.s_venues(1);

        assertFalse(isActive);
    }

    function testSetPassTier() public {
        bytes memory data = abi.encodeCall(CulturePass.setPassTier, (CulturePass.Tier.Explorer, 30, 0.01 ether, 3));

        _exec(data);

        (uint256 tickets, uint256 price, uint256 cap) = cPass.s_passTiers(CulturePass.Tier.Explorer);

        assertEq(tickets, 30);
        assertEq(price, 0.01 ether);
        assertEq(cap, 3);
    }
}
