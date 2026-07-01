// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Test, console} from "../../lib/forge-std/src/Test.sol";
import {CulturePass} from "../../src/CulturePass.sol";
import {TicketToken} from "../../src/TicketToken.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title CulturePassPassLifecycle
 * @author Yusuf Arslan
 * @notice Unit tests for the pass lifecycle features: upgradePass / upgradePassWithTickets,
 *         purchasePassWithTickets (ticket reclaim), and cancelMembership.
 */
contract CulturePassPassLifecycle is Test {
    TicketToken public ticketToken;
    CulturePass public cPass;
    address VISITOR = makeAddr("visitor");

    // Tier config used across tests. Ticket price == monthlyTickets keeps ticket-paid
    // actions solvency-neutral (see setTierTicketPrice guard).
    uint256 constant EXPLORER_TICKETS = 30;
    uint256 constant ENTHUSIAST_TICKETS = 60;
    uint256 constant PATRON_TICKETS = 90;

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

        cPass.setPassTier(CulturePass.Tier.Explorer, EXPLORER_TICKETS, 0.01 ether, 3);
        cPass.setPassTier(CulturePass.Tier.Enthusiast, ENTHUSIAST_TICKETS, 0.02 ether, 6);
        cPass.setPassTier(CulturePass.Tier.Patron, PATRON_TICKETS, 0.03 ether, 9);

        cPass.setTierTicketPrice(CulturePass.Tier.Explorer, EXPLORER_TICKETS);
        cPass.setTierTicketPrice(CulturePass.Tier.Enthusiast, ENTHUSIAST_TICKETS);
        cPass.setTierTicketPrice(CulturePass.Tier.Patron, PATRON_TICKETS);

        vm.deal(VISITOR, 10 ether);
    }

    // Deploys a second instance where pass tiers exist but NO ticket prices are set.
    // Used to exercise the CulturePass__ticketPriceNotSet branch in isolation.
    function _deployWithoutTicketPrices() internal returns (CulturePass) {
        CulturePass impl = new CulturePass();
        TicketToken tt = new TicketToken();
        bytes memory initData = abi.encodeCall(
            CulturePass.initialize,
            (address(tt), address(this))
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        CulturePass fresh = CulturePass(payable(address(proxy)));
        tt.setCulturePassAddress(address(fresh));
        fresh.setPassTier(CulturePass.Tier.Explorer, EXPLORER_TICKETS, 0.01 ether, 3);
        fresh.setPassTier(CulturePass.Tier.Enthusiast, ENTHUSIAST_TICKETS, 0.02 ether, 6);
        return fresh;
    }

    /*//////////////////////////////////////////////////////////////
                        setTierTicketPrice (admin)
    //////////////////////////////////////////////////////////////*/

    function testSetTierTicketPrice() public {
    cPass.setTierTicketPrice(CulturePass.Tier.Explorer, 40); // 40 >= monthlyTickets (30)
    assertEq(cPass.s_tierTicketPrice(CulturePass.Tier.Explorer), 40);
}

    function testSetTierTicketPriceRevertsBelowMonthlyTickets() public {
        // Explorer grants 30 tickets; a ticket price below that would mint unbacked claims.
        vm.expectRevert(CulturePass.CulturePass__ticketPriceTooLow.selector);
        cPass.setTierTicketPrice(CulturePass.Tier.Explorer, EXPLORER_TICKETS - 1);
    }

    function testSetTierTicketPriceRevertsForNone() public {
        vm.expectRevert(CulturePass.CulturePass__invalidTier.selector);
        cPass.setTierTicketPrice(CulturePass.Tier.None, 10);
    }

    /*//////////////////////////////////////////////////////////////
                        purchasePassWithTickets
    //////////////////////////////////////////////////////////////*/

    function testPurchasePassWithTickets() public {
        // Buy Explorer with ETH -> 30 tickets, let it expire, then recycle those tickets.
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.warp(block.timestamp + 35 days);

        uint256 balanceBefore = ticketToken.balanceOf(VISITOR, 0);

        vm.prank(VISITOR);
        cPass.purchasePassWithTickets(CulturePass.Tier.Explorer);

        (CulturePass.Tier tier, uint256 expiry) = cPass.s_userPasses(VISITOR);
        assertEq(uint256(tier), uint256(CulturePass.Tier.Explorer));
        assertGt(expiry, block.timestamp);
        // Burned 30, minted 30 -> balance unchanged (solvency-neutral).
        assertEq(ticketToken.balanceOf(VISITOR, 0), balanceBefore);
    }

    function testPurchasePassWithTicketsRevertsIfPassStillActive() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.expectRevert(CulturePass.CulturePass__passStillNOTExpired.selector);
        cPass.purchasePassWithTickets(CulturePass.Tier.Explorer);
        vm.stopPrank();
    }

    function testPurchasePassWithTicketsRevertsIfNotEnoughTickets() public {
        // Visitor holds 0 tickets -> the burn inside the function reverts.
        vm.prank(VISITOR);
        vm.expectRevert();
        cPass.purchasePassWithTickets(CulturePass.Tier.Explorer);
    }

    function testPurchasePassWithTicketsRevertsIfTicketPriceNotSet() public {
        CulturePass fresh = _deployWithoutTicketPrices();
        vm.prank(VISITOR);
        vm.expectRevert(CulturePass.CulturePass__ticketPriceNotSet.selector);
        fresh.purchasePassWithTickets(CulturePass.Tier.Explorer);
    }

    /*//////////////////////////////////////////////////////////////
                        upgradePass (ETH difference)
    //////////////////////////////////////////////////////////////*/

    function testUpgradePassExplorerToEnthusiast() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        (, uint256 expiryBefore) = cPass.s_userPasses(VISITOR);
        uint256 balanceBefore = ticketToken.balanceOf(VISITOR, 0); // 30

        cPass.upgradePass{value: 0.01 ether}(CulturePass.Tier.Enthusiast); // diff = 0.02 - 0.01
        vm.stopPrank();

        (CulturePass.Tier tier, uint256 expiryAfter) = cPass.s_userPasses(VISITOR);
        assertEq(uint256(tier), uint256(CulturePass.Tier.Enthusiast));
        assertEq(expiryAfter, expiryBefore); // upgrade keeps expiry
        // Minted the ticket difference (60 - 30 = 30).
        assertEq(ticketToken.balanceOf(VISITOR, 0), balanceBefore + (ENTHUSIAST_TICKETS - EXPLORER_TICKETS));
    }

    function testUpgradePassExplorerToPatron() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        cPass.upgradePass{value: 0.02 ether}(CulturePass.Tier.Patron); // diff = 0.03 - 0.01
        vm.stopPrank();

        (CulturePass.Tier tier, ) = cPass.s_userPasses(VISITOR);
        assertEq(uint256(tier), uint256(CulturePass.Tier.Patron));
        assertEq(ticketToken.balanceOf(VISITOR, 0), PATRON_TICKETS); // 30 + (90 - 30)
    }

    function testUpgradePassRevertsOnSameTier() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.02 ether}(CulturePass.Tier.Enthusiast);
        vm.expectRevert(CulturePass.CulturePass__notAnUpgrade.selector);
        cPass.upgradePass{value: 0}(CulturePass.Tier.Enthusiast);
        vm.stopPrank();
    }

    function testUpgradePassRevertsOnDowngrade() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.03 ether}(CulturePass.Tier.Patron);
        vm.expectRevert(CulturePass.CulturePass__notAnUpgrade.selector);
        cPass.upgradePass{value: 0}(CulturePass.Tier.Explorer);
        vm.stopPrank();
    }

    function testUpgradePassRevertsOnWrongEthAmount() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.expectRevert(CulturePass.CulturePass__insufficientFunds.selector);
        cPass.upgradePass{value: 0.02 ether}(CulturePass.Tier.Enthusiast); // should be 0.01
        vm.stopPrank();
    }

    function testUpgradePassRevertsIfExpired() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.warp(block.timestamp + 35 days);
        vm.expectRevert(CulturePass.CulturePass__passExpired.selector);
        cPass.upgradePass{value: 0.01 ether}(CulturePass.Tier.Enthusiast);
        vm.stopPrank();
    }

    function testUpgradePassRevertsIfNoPass() public {
        // No pass -> expiry is 0, so the active-pass check fails with passExpired.
        vm.prank(VISITOR);
        vm.expectRevert(CulturePass.CulturePass__passExpired.selector);
        cPass.upgradePass{value: 0.01 ether}(CulturePass.Tier.Enthusiast);
    }

    /*//////////////////////////////////////////////////////////////
                    upgradePassWithTickets (ticket paid)
    //////////////////////////////////////////////////////////////*/

    function testUpgradePassWithTickets() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer); // 30 tickets
        uint256 balanceBefore = ticketToken.balanceOf(VISITOR, 0);

        // cost = tp[Enthusiast] - tp[Explorer] = 60 - 30 = 30 burned;
        // minted diff = 60 - 30 = 30 -> net zero.
        cPass.upgradePassWithTickets(CulturePass.Tier.Enthusiast);
        vm.stopPrank();

        (CulturePass.Tier tier, ) = cPass.s_userPasses(VISITOR);
        assertEq(uint256(tier), uint256(CulturePass.Tier.Enthusiast));
        assertEq(ticketToken.balanceOf(VISITOR, 0), balanceBefore); // neutral
    }

    function testUpgradePassWithTicketsRevertsIfNotEnoughTickets() public {
        // Explorer holder has 30 tickets; upgrading to Patron costs 90 - 30 = 60 -> burn reverts.
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.expectRevert();
        cPass.upgradePassWithTickets(CulturePass.Tier.Patron);
        vm.stopPrank();
    }

    function testUpgradePassWithTicketsRevertsOnDowngrade() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.02 ether}(CulturePass.Tier.Enthusiast);
        vm.expectRevert(CulturePass.CulturePass__notAnUpgrade.selector);
        cPass.upgradePassWithTickets(CulturePass.Tier.Explorer);
        vm.stopPrank();
    }

    function testUpgradePassWithTicketsRevertsIfExpired() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.warp(block.timestamp + 35 days);
        vm.expectRevert(CulturePass.CulturePass__passExpired.selector);
        cPass.upgradePassWithTickets(CulturePass.Tier.Enthusiast);
        vm.stopPrank();
    }

    function testUpgradePassWithTicketsRevertsIfTicketPriceNotSet() public {
        CulturePass fresh = _deployWithoutTicketPrices();
        vm.startPrank(VISITOR);
        fresh.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.expectRevert(CulturePass.CulturePass__ticketPriceNotSet.selector);
        fresh.upgradePassWithTickets(CulturePass.Tier.Enthusiast);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                            cancelMembership
    //////////////////////////////////////////////////////////////*/

    function testCancelMembership() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        uint256 ticketsHeld = ticketToken.balanceOf(VISITOR, 0);

        cPass.cancelMembership();
        vm.stopPrank();

        (CulturePass.Tier tier, uint256 expiry) = cPass.s_userPasses(VISITOR);
        assertEq(uint256(tier), uint256(CulturePass.Tier.None));
        assertEq(expiry, 0);
        // No refund, tickets retained.
        assertEq(ticketToken.balanceOf(VISITOR, 0), ticketsHeld);
    }

    function testCancelMembershipRevertsIfNoActivePass() public {
        vm.prank(VISITOR);
        vm.expectRevert(CulturePass.CulturePass__noActivePass.selector);
        cPass.cancelMembership();
    }

    function testCancelMembershipRevertsIfExpired() public {
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.warp(block.timestamp + 35 days);
        vm.expectRevert(CulturePass.CulturePass__noActivePass.selector);
        cPass.cancelMembership();
        vm.stopPrank();
    }

    function testCancelThenReclaimWithTickets() public {
        // Full intended flow: buy -> cancel (keep tickets) -> re-enter using kept tickets.
        vm.startPrank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        cPass.cancelMembership();

        uint256 keptTickets = ticketToken.balanceOf(VISITOR, 0);
        assertEq(keptTickets, EXPLORER_TICKETS);

        cPass.purchasePassWithTickets(CulturePass.Tier.Explorer);
        vm.stopPrank();

        (CulturePass.Tier tier, uint256 expiry) = cPass.s_userPasses(VISITOR);
        assertEq(uint256(tier), uint256(CulturePass.Tier.Explorer));
        assertGt(expiry, block.timestamp);
    }
}
