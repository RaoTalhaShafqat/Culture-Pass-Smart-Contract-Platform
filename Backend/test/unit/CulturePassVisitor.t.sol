// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Test, console} from "../../lib/forge-std/src/Test.sol";
import {CulturePass} from "../../src/CulturePass.sol";
import {TicketToken} from "../../src/TicketToken.sol";

contract CulturePassVisitor is Test {
    TicketToken public ticketToken;
    CulturePass public cPass;
    address VISITOR = makeAddr("visitor");

    function setUp() public {
        ticketToken = new TicketToken();
        cPass = new CulturePass();
        cPass.initialize(address(ticketToken), address(this));
        ticketToken.setCulturePassAddress(address(cPass));
        cPass.setPassTier(CulturePass.Tier.Explorer, 30, 0.01 ether, 3);
        cPass.setPassTier(CulturePass.Tier.Enthusiast, 60, 0.02 ether, 6);
        vm.deal(VISITOR, 1 ether);
    }

    function testPurchasePass() public {
        // Test purchasing a pass with valid parameters
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);

        (CulturePass.Tier tier, uint256 expiry) = cPass.s_userPasses(VISITOR);
        console.log("Purchased Pass Tier:", uint256(tier));
        console.log("Pass Expiry Timestamp:", expiry);
        assertEq(uint256(tier), uint256(CulturePass.Tier.Explorer));
    }

    function testPurchasePassInsufficientFunds() public {
        // Test purchasing a pass with insufficient funds
        vm.prank(VISITOR);
        vm.expectRevert(CulturePass.CulturePass__insufficientFunds.selector);
        cPass.purchasePass{value: 0.005 ether}(CulturePass.Tier.Explorer);
    }

    function testPurchasePassStillNotExpired() public {
        // Test purchasing a pass when the previous pass is still not expired
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);

        vm.prank(VISITOR);
        vm.expectRevert(CulturePass.CulturePass__passStillNOTExpired.selector);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
    }

    function testPurchasePassDifferentTierAfterPreviousExpired() public {
        // Test purchasing a pass with an invalid tier
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        // Fast forward time to after the pass has expired
        vm.warp(block.timestamp + 35 days);
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.02 ether}(CulturePass.Tier.Enthusiast);
        (CulturePass.Tier tier, uint256 expiry) = cPass.s_userPasses(VISITOR);
        console.log("Purchased Pass Tier:", uint256(tier));
        console.log("Pass Expiry Timestamp:", expiry);
        assertEq(uint256(tier), uint256(CulturePass.Tier.Enthusiast));
    }

    function testPurchasePassDifferentTierAfterPreviousNotExpired() public {
        // Test purchasing a pass with an invalid tier
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        // Fast forward time to after the pass has not expired
        vm.warp(block.timestamp + 20 days);
        vm.prank(VISITOR);
        vm.expectRevert(CulturePass.CulturePass__passStillNOTExpired.selector);
        cPass.purchasePass{value: 0.02 ether}(CulturePass.Tier.Enthusiast);
    }

    function testRenewPass() public {
        // Test renewing a pass after it has expired
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);

        // Fast forward time to after the pass has still not expired
        vm.warp(block.timestamp + 25 days);

        vm.prank(VISITOR);
        cPass.renewPass{value: 0.01 ether}();

        (CulturePass.Tier tier, uint256 expiry) = cPass.s_userPasses(VISITOR);
        console.log("Renewed Pass Tier:", uint256(tier));
        console.log("New Pass Expiry Timestamp:", expiry);
        assertEq(uint256(tier), uint256(CulturePass.Tier.Explorer));
    }

    function testRenewPassNoActivePass() public {
        // Test renewing a pass when there is no active pass
        vm.prank(VISITOR);
        vm.expectRevert(CulturePass.CulturePass__noActivePass.selector);
        cPass.renewPass{value: 0.01 ether}();
    }

    function testRenewPassExpired() public {
        // Test renewing a pass after it has expired
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);

        // Fast forward time to after the pass has expired
        vm.warp(block.timestamp + 35 days);

        vm.prank(VISITOR);
        vm.expectRevert(CulturePass.CulturePass__passExpired.selector);
        cPass.renewPass{value: 0.01 ether}();
    }

    function testRedeemEntry() public {
        cPass.registerVenue(1, "Louvre Museum", address(0x123), CulturePass.Category.Museum, 2, 3);

        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        uint256 balanceBefore = ticketToken.balanceOf(VISITOR, 0);
        console.log(balanceBefore);
        cPass.redeemEntry(1);
        uint256 balanceAfter = ticketToken.balanceOf(VISITOR, 0);
        console.log(balanceAfter);
        vm.stopPrank();

        assertEq(balanceAfter, balanceBefore - 2);
        assertEq(cPass.s_venueEarnings(address(0x123)), 2);
    }
}
