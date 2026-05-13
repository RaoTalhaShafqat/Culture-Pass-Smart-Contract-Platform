#CULTRACHAIN
#Scenario
CulturePass is a city-wide cultural access network. Museums, art galleries, theaters, concert halls, and heritage sites register as venues on a shared smart contract platform. Users purchase a monthly pass that mints a bundle of Tickets (an ERC-1155-compatible token) to their wallet. They redeem these tickets to gain entry to any registered venue. Venues withdraw their accumulated earnings at the end of each billing period.

Passes come in three tiers that differ in ticket allowance and in how many times per month a visitor may enter a given venue category (e.g. museum, theater, gallery, heritage) or a specific venue: Explorer (up to 3 visits/month per category and per venue), Enthusiast (up to 6 visits/month), and Patron (up to 10 visits/month). The EntryLedger enforces these caps on-chain, resetting counters at the start of each calendar month.

In addition to the monthly cap, every venue declares a maximum daily capacity — the total number of visitors it can admit on a single calendar day. The EntryLedger enforces two independent caps simultaneously: the monthly visit cap and the daily capacity cap. A visitor's redeem() call reverts if either cap is exceeded. This means a popular venue can block further entry for the rest of the day even when visitors still have remaining monthly quota.

The platform is governed by an admin (the CulturePass foundation) who whitelists venues, sets pass tiers, and manages the ticket-to-ETH exchange rate. No central intermediary holds user funds: payments flow directly through the contracts.

#Stakeholders

Admin:   Deploys and configures the platform; whitelists venues; sets pass tiers and exchange rate
Visitor: Purchases a pass; holds Tickets; redeems entry at venues
Venue:	 Registered cultural provider; sets entry price and daily capacity; accepts entry; withdraws earnings

#User Stories
Admin
US-A1: As an admin, I want to register and whitelist a venue (by wallet address, name, venue ID, category, and maximum daily visitor capacity) so that visitors can redeem entry there and both visit caps can be enforced.
US-A2: As an admin, I want to remove a venue from the whitelist so that it can no longer accept new entries.
US-A3: As an admin, I want to define pass tiers (e.g. Explorer: 30 Tickets / month at 0.01 ETH, Enthusiast: 60 Tickets / month at 0.02 ETH, Patron: 100 Tickets / month at 0.03 ETH) and set the ticket-to-ETH exchange rate so that visitors can choose a plan and venues can be paid fairly.

Visitor
US-V1: As a visitor, I want to purchase a monthly pass tier by sending ETH so that I receive the corresponding Ticket balance.
US-V2: As a visitor, I want to renew my pass before it expires so that my Ticket balance is topped up and my pass period is extended.
US-V3: As a visitor with an expired pass, I want to be prevented from redeeming entry so that the system enforces the pass requirement.
US-V4: As a visitor, I want to redeem entry to a registered venue by spending the required tickets so that my visit is recorded on-chain.
US-V5: As a visitor, I want to be blocked from entering once I have reached my tier's monthly visit cap for a specific venue category or for a specific venue so that the system enforces the tier limits.
US-V6: As a visitor, I want to be blocked from entering a venue that has reached its maximum daily visitor capacity so that crowd limits are respected.
US-V7: As a visitor, I want to view my current ticket balance, pass expiry, remaining monthly visits per category and venue, and today's remaining capacity at any venue so that I can plan my cultural outings.

Venue
US-E1: As a venue, I want to set and update my standard entry price in tickets and my maximum daily visitor capacity so that I can reflect real-world admission fees and manage crowd flow.
US-E2: As a venue, I want to receive a ticket allocation whenever a visitor redeems entry at my location so that my earnings accumulate on-chain.
US-E3: As a venue, I want to withdraw my accumulated tickets (converted to ETH at the current exchange rate) so that I receive payment for the visits I provided.
US-E4: As a venue, I want to view my total accumulated earnings so that I can track revenue before withdrawing.

#MoreInFuture
Please stay tuned for the platform development its ongoing.
