// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "../../lib/forge-std/src/Test.sol";
import {CulturePass} from "../../src/CulturePass.sol";
import {TicketToken} from "../../src/TicketToken.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title CulturePassVenue unit tests
 * @author Yusuf Arslan
 * @notice Covers the Venue user stories US-E1..US-E4 (updateVenue, withdrawEarnings,
 *         getVenueEarnings, receive) plus the new admin reactivateVenue function.
 * @dev Uses the same proxy-based unit setup as the other unit suites: the test contract
 *      itself is the proxy owner, so owner-only calls (registerVenue, setExchangeRate,
 *      reactivateVenue) are made directly without going through the MockSafe multisig.
 */
contract CulturePassVenue is Test {
    CulturePass public cPass;
    TicketToken public ticketToken;

    address VENUE = makeAddr("venue");
    address VISITOR = makeAddr("visitor");
    address VISITOR2 = makeAddr("visitor2");
    address STRANGER = makeAddr("stranger");

    uint256 constant VENUE_ID = 1;
    uint256 constant ENTRY_PRICE = 10; // in ticket tokens
    uint256 constant CAPACITY = 100;
    uint256 constant RATE = 1e15; // wei per ticket -> 10 tickets = 0.01 ether

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

        // Pass tier so visitors can buy tickets and redeem (drives earnings accrual).
        cPass.setPassTier(CulturePass.Tier.Explorer, 30, 0.01 ether, 3);

        // A venue owned by the VENUE wallet.
        cPass.registerVenue(
            VENUE_ID,
            "Louvre Museum",
            VENUE,
            CulturePass.Category.Museum,
            ENTRY_PRICE,
            CAPACITY
        );

        // Represent platform ETH liquidity already accumulated from pass sales,
        // so withdrawals are never starved of ETH in these tests.
        vm.deal(address(cPass), 10 ether);
    }

    /*//////////////////////////////////////////////////////////////
                                helpers
    //////////////////////////////////////////////////////////////*/

    /// @dev Gives `visitor` an Explorer pass and redeems entry to `venueId`,
    ///      which credits ENTRY_PRICE tickets to that venue's earnings.
    function _accrue(address visitor, uint256 venueId) internal {
        vm.deal(visitor, 1 ether);
        vm.prank(visitor);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.prank(visitor);
        cPass.redeemEntry(venueId);
    }

    /*//////////////////////////////////////////////////////////////
                        updateVenue (US-E1)
    //////////////////////////////////////////////////////////////*/

    function testUpdateVenueByOwner() public {
        vm.prank(VENUE);
        cPass.updateVenue(VENUE_ID, 25, 200);

        (, , , , uint256 entryPrice, uint256 dailyCapacity, ) = cPass.s_venues(
            VENUE_ID
        );
        assertEq(entryPrice, 25);
        assertEq(dailyCapacity, 200);
    }

    function testUpdateVenueRevertsForNonOwner() public {
        vm.prank(STRANGER);
        vm.expectRevert(CulturePass.CulturePass__notVenueOwner.selector);
        cPass.updateVenue(VENUE_ID, 25, 200);
    }

    function testUpdateVenueRevertsForUnknownVenue() public {
        vm.prank(VENUE);
        vm.expectRevert(CulturePass.CulturePass__venueNotFound.selector);
        cPass.updateVenue(999, 25, 200);
    }

    function testUpdateVenueRevertsOnZeroPrice() public {
        vm.prank(VENUE);
        vm.expectRevert(CulturePass.CulturePass__invalidEntryPrice.selector);
        cPass.updateVenue(VENUE_ID, 0, 200);
    }

    function testUpdateVenueRevertsOnZeroCapacity() public {
        vm.prank(VENUE);
        vm.expectRevert(CulturePass.CulturePass__invalidDailyCapacity.selector);
        cPass.updateVenue(VENUE_ID, 25, 0);
    }

    /*//////////////////////////////////////////////////////////////
                      withdrawEarnings (US-E3)
    //////////////////////////////////////////////////////////////*/

    function testWithdrawEarningsHappyPath() public {
        _accrue(VISITOR, VENUE_ID); // earnings[VENUE] = ENTRY_PRICE
        cPass.setExchangeRate(RATE);

        uint256 expectedEth = ENTRY_PRICE * RATE;
        uint256 balanceBefore = VENUE.balance;

        vm.prank(VENUE);
        cPass.withdrawEarnings();

        assertEq(VENUE.balance, balanceBefore + expectedEth);
        assertEq(cPass.s_venueEarnings(VENUE), 0);

        (uint256 tickets, uint256 ethValue) = cPass.getVenueEarnings(VENUE);
        assertEq(tickets, 0);
        assertEq(ethValue, 0);
    }

    function testWithdrawRevertsWhenExchangeRateNotSet() public {
        _accrue(VISITOR, VENUE_ID);
        // exchange rate deliberately left at 0
        vm.prank(VENUE);
        vm.expectRevert(CulturePass.CulturePass__exchangeRateNotSet.selector);
        cPass.withdrawEarnings();
    }

    function testWithdrawRevertsWhenNoEarnings() public {
        cPass.setExchangeRate(RATE);
        vm.prank(STRANGER); // has zero earnings
        vm.expectRevert(CulturePass.CulturePass__noEarningsToWithdraw.selector);
        cPass.withdrawEarnings();
    }

    function testWithdrawRevertsWhenTransferFails() public {
        RejectingVenue rejecter = new RejectingVenue(cPass);
        cPass.registerVenue(
            2,
            "Rejecter",
            address(rejecter),
            CulturePass.Category.Gallery,
            ENTRY_PRICE,
            CAPACITY
        );
        _accrue(VISITOR, 2);
        cPass.setExchangeRate(RATE);

        vm.expectRevert(CulturePass.CulturePass__withdrawalFailed.selector);
        rejecter.withdraw();
    }

    /// @notice Proves the checks-effects-interactions pattern blocks reentrancy:
    ///         the balance is zeroed before the ETH transfer, so a reentrant
    ///         withdraw during receive() finds 0 earnings and cannot double-spend.
    function testWithdrawIsReentrancySafe() public {
        ReentrantVenue attacker = new ReentrantVenue(cPass);
        cPass.registerVenue(
            3,
            "Attacker",
            address(attacker),
            CulturePass.Category.Theater,
            ENTRY_PRICE,
            CAPACITY
        );
        _accrue(VISITOR, 3);
        cPass.setExchangeRate(RATE);

        uint256 expectedEth = ENTRY_PRICE * RATE;

        attacker.attack();

        // Reentry was attempted but earned the attacker nothing extra.
        assertTrue(attacker.reentered());
        assertEq(address(attacker).balance, expectedEth);
        assertEq(cPass.s_venueEarnings(address(attacker)), 0);
    }

    /*//////////////////////////////////////////////////////////////
                       getVenueEarnings (US-E4)
    //////////////////////////////////////////////////////////////*/

    function testGetVenueEarningsReflectsAccrualAndRate() public {
        _accrue(VISITOR, VENUE_ID);
        cPass.setExchangeRate(RATE);

        (uint256 tickets, uint256 ethValue) = cPass.getVenueEarnings(VENUE);
        assertEq(tickets, ENTRY_PRICE);
        assertEq(ethValue, ENTRY_PRICE * RATE);
    }

    function testGetVenueEarningsZeroEthWhenRateUnset() public {
        _accrue(VISITOR, VENUE_ID);
        // rate stays 0 -> ethValue should be 0 even though tickets > 0
        (uint256 tickets, uint256 ethValue) = cPass.getVenueEarnings(VENUE);
        assertEq(tickets, ENTRY_PRICE);
        assertEq(ethValue, 0);
    }

    function testGetVenueEarningsZeroForUnknownWallet() public {
        (uint256 tickets, uint256 ethValue) = cPass.getVenueEarnings(STRANGER);
        assertEq(tickets, 0);
        assertEq(ethValue, 0);
    }

    /*//////////////////////////////////////////////////////////////
                            receive (US-E2)
    //////////////////////////////////////////////////////////////*/

    function testReceiveAcceptsEth() public {
        uint256 before = address(cPass).balance;
        vm.deal(address(this), 1 ether);
        (bool ok, ) = address(cPass).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(address(cPass).balance, before + 1 ether);
    }

    /*//////////////////////////////////////////////////////////////
                          reactivateVenue
    //////////////////////////////////////////////////////////////*/

    function testReactivateVenue() public {
        cPass.removeVenue(VENUE_ID);
        (, , , , , , bool inactive) = cPass.s_venues(VENUE_ID);
        assertFalse(inactive);

        cPass.reactivateVenue(VENUE_ID);
        (, , , , , , bool active) = cPass.s_venues(VENUE_ID);
        assertTrue(active);
    }

    function testReactivateRevertsForNonOwner() public {
        cPass.removeVenue(VENUE_ID);
        vm.prank(STRANGER);
        vm.expectRevert(
            abi.encodeWithSignature(
                "OwnableUnauthorizedAccount(address)",
                STRANGER
            )
        );
        cPass.reactivateVenue(VENUE_ID);
    }

    function testReactivateRevertsForUnknownVenue() public {
        vm.expectRevert(CulturePass.CulturePass__venueNotFound.selector);
        cPass.reactivateVenue(999);
    }

    function testReactivateRevertsIfAlreadyActive() public {
        // Venue 1 is active straight after registration.
        vm.expectRevert(CulturePass.CulturePass__venueAlreadyActive.selector);
        cPass.reactivateVenue(VENUE_ID);
    }

    /// @notice End-to-end: a removed venue rejects redemption, and reactivation restores it.
    function testRedeemWorksAgainAfterReactivation() public {
        cPass.removeVenue(VENUE_ID);

        // While inactive, redeeming reverts (venue treated as not found).
        vm.deal(VISITOR, 1 ether);
        vm.prank(VISITOR);
        cPass.purchasePass{value: 0.01 ether}(CulturePass.Tier.Explorer);
        vm.prank(VISITOR);
        vm.expectRevert(CulturePass.CulturePass__venueNotFound.selector);
        cPass.redeemEntry(VENUE_ID);

        // After reactivation, the same visitor can redeem and the venue earns.
        cPass.reactivateVenue(VENUE_ID);
        vm.prank(VISITOR);
        cPass.redeemEntry(VENUE_ID);
        assertEq(cPass.s_venueEarnings(VENUE), ENTRY_PRICE);
    }
}

/*//////////////////////////////////////////////////////////////
                        test helper contracts
//////////////////////////////////////////////////////////////*/

/// @dev Venue wallet that rejects ETH, used to exercise the withdrawalFailed branch.
contract RejectingVenue {
    CulturePass private immutable i_cPass;

    constructor(CulturePass _cPass) {
        i_cPass = _cPass;
    }

    function withdraw() external {
        i_cPass.withdrawEarnings();
    }

    receive() external payable {
        revert("RejectingVenue: no ETH");
    }
}

/// @dev Venue wallet that attempts to reenter withdrawEarnings during receive().
contract ReentrantVenue {
    CulturePass private immutable i_cPass;
    bool public reentered;

    constructor(CulturePass _cPass) {
        i_cPass = _cPass;
    }

    function attack() external {
        i_cPass.withdrawEarnings();
    }

    receive() external payable {
        if (!reentered) {
            reentered = true;
            // Should fail (earnings already zeroed) and is swallowed so the
            // outer withdrawal still succeeds — proving no double-withdraw.
            try i_cPass.withdrawEarnings() {} catch {}
        }
    }
}
