// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Test, console} from "../../lib/forge-std/src/Test.sol";
import {CulturePass} from "../../src/CulturePass.sol";
import {TicketToken} from "../../src/TicketToken.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract CulturePassVisitor is Test {
    TicketToken public ticketToken;
    CulturePass public cPass;
    address VISITOR = makeAddr("visitor");

    function setUp() public {
        CulturePass impl = new CulturePass();
        ticketToken = new TicketToken();
        bytes memory initData = abi.encodeCall(
            CulturePass.initialize,
            (address(ticketToken), address(this))
        );

        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        cPass = CulturePass(payable(address(proxy)));
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
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0x123),
            CulturePass.Category.Museum,
            2,
            3
        );

        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        uint256 balanceBefore = ticketToken.balanceOf(VISITOR, 0);
        console.log(balanceBefore);
        cPass.redeemEntry(1);
        uint256 balanceAfter = ticketToken.balanceOf(VISITOR, 0);
        console.log(balanceAfter);
        vm.stopPrank();
        uint256 currentMonth = block.timestamp / 30 days;
        assertEq(balanceAfter, balanceBefore - 2);
        assertEq(cPass.s_venueEarnings(address(0x123)), 2);
        assertEq(
            cPass.s_categoryVisits(
                address(VISITOR),
                currentMonth,
                CulturePass.Category.Museum
            ),
            1
        );
    }

    function testRedeemEntryFailedBecausePassExpired() public {
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0x123),
            CulturePass.Category.Museum,
            2,
            3
        );

        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.warp(block.timestamp + 35 days);
        vm.expectRevert(CulturePass.CulturePass__passExpired.selector);
        cPass.redeemEntry(1);
        vm.stopPrank();
    }

    function testMontlyRedeemLimitReached() public {
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0x123),
            CulturePass.Category.Museum,
            2,
            5
        );
        cPass.registerVenue(
            2,
            "Louvre Theater",
            address(0x124),
            CulturePass.Category.Theater,
            2,
            1
        );

        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        cPass.redeemEntry(2);
        vm.expectRevert(CulturePass.CulturePass__venueClosedForTheDay.selector);
        cPass.redeemEntry(2);
        cPass.redeemEntry(1);
        cPass.redeemEntry(1);
        cPass.redeemEntry(1);
        vm.expectRevert(
            CulturePass.CulturePass__montlyLimitReachedForPass.selector
        );
        cPass.redeemEntry(1);
        vm.stopPrank();
    }

    function testRedeemFailsBecauseVenueNotActive() public {
        cPass.registerVenue(
            1,
            "Louvre Museum",
            address(0x123),
            CulturePass.Category.Museum,
            2,
            5
        );

        cPass.removeVenue(1);
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.expectRevert(CulturePass.CulturePass__venueNotFound.selector);
        cPass.redeemEntry(1);
        vm.stopPrank();
    }

    function testGetPassInfo() public {
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);

        (CulturePass.Tier tier, uint256 expiry) = cPass.getPassInfo(VISITOR);

        assertEq(uint256(tier), uint256(CulturePass.Tier.Explorer));
        assertGt(expiry, block.timestamp);
    }

    function testGetRemainingTicketTokens() public {
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);

        uint256 balance = cPass.getRemainingTicketTokens(VISITOR);

        assertGt(balance, 0);
    }

    function testGetRemainingCategoryVisits() public {
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);

        uint256 remainingBefore = cPass.getRemainingCategoryVisits(
            VISITOR,
            CulturePass.Category.Museum
        );

        assertEq(remainingBefore, 3);

        cPass.registerVenue(
            1,
            "Louvre",
            address(0x123),
            CulturePass.Category.Museum,
            2,
            5
        );

        vm.prank(VISITOR);
        cPass.redeemEntry(1);

        uint256 remainingAfter = cPass.getRemainingCategoryVisits(
            VISITOR,
            CulturePass.Category.Museum
        );

        assertEq(remainingAfter, 2);
    }
}
