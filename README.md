🎭 CulturePass

📌 Overview

CulturePass is a city-wide cultural access network powered by smart contracts. It enables visitors to explore museums, galleries, theaters, concert halls, and heritage sites using a unified on-chain ticketing system. Users purchase a monthly pass that mints ERC-1155 compatible Tickets to their wallet. These tickets can be redeemed across registered venues, while smart contracts enforce strict monthly and daily access limits. Venues receive on-chain payments and can withdraw earnings at the end of each billing cycle.

🏗️ System Architecture

The platform consists of three main components:

Pass System → Handles subscription tiers and ticket minting

EntryLedger → Enforces visit limits and daily capacity rules

Venue Registry → Manages whitelisted cultural venues

👥 Stakeholders

🛠️ Admin (CulturePass Foundation)

Deploys and manages the platform
Whitelists and removes venues
Defines pass tiers and pricing
Sets ticket-to-ETH exchange rate

🎟️ Visitor

Purchases monthly passes
Receives ERC-1155 Tickets
Redeems entry at venues
Enforced by monthly and daily limits

🏛️ Venue

Registers cultural locations
Sets entry price and daily capacity
Receives ticket payments
Withdraws accumulated earnings

📖 User Stories

🛠️ Admin

US-A1: Register and whitelist a venue with metadata (address, name, ID, category, daily capacity)

US-A2: Remove a venue from whitelist

US-A3: Define pass tiers and ticket pricing

🎟️ Visitor

US-V1: Purchase a monthly pass and receive Tickets

US-V2: Renew pass before expiry

US-V3: Be blocked from redeeming if pass is expired

US-V4: Redeem entry using tickets

US-V5: Be blocked after reaching monthly visit caps per category or venue

US-V6: Be blocked if venue reaches daily capacity

US-V7: View ticket balance, expiry, and remaining visit limits

🏛️ Venue

US-E1: Set and update entry price and daily capacity

US-E2: Receive ticket payments on visitor entry

US-E3: Withdraw accumulated earnings in ETH

US-E4: View total earnings before withdrawal

🔁 Key Rules & Constraints

📅 Monthly Limits

Reset at the start of each calendar month

Enforced per: Venue category & Individual venue

🏟️ Daily Capacity

Each venue sets a maximum visitor limit per day
Once reached, no further entries are allowed that day

❌ Entry Reverts If:

Pass is expired

Monthly limit exceeded

Venue capacity reached

Insufficient ticket balance

💸 Payment Flow

Visitor purchases pass with ETH

Contract mints ERC-1155 Tickets

Visitor redeems tickets at venue

Tickets are recorded as earnings

Venue withdraws ETH at end of billing cycle

🔐 Security Model

No centralized custody of user funds

All payments handled by smart contracts

Whitelisted venue system prevents abuse

On-chain enforcement of all limits

🚀 Future Improvements

Dynamic pricing based on demand

NFT-based loyalty rewards

Off-chain indexing for analytics dashboard

Multi-city expansion support

DAO governance for admin control

📦 Status

🟡 Project is currently in development — more features coming soon.
