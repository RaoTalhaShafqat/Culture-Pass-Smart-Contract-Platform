import {
    createWalletClient,
    createPublicClient,
    custom,
    formatEther,
    type Chain,
} from "viem";
import "viem/window";

import { abi, type ChainDeployment } from "./constants-ts.ts";
import { resolveChain, getDeployment } from "./chains.ts";
import { supabase } from "./supabase"; // <-- IMPORT SUPABASE

// ---------------------
// STATE
// ---------------------
// Venue functions are NOT owner-gated, so they always call the proxy directly —
// the only chain-specific part is WHICH proxy (Anvil vs Sepolia deployment).
let walletClient: any;
let publicClient: any;
let account: `0x${string}`;
let currentChain: Chain;
let deployment: ChainDeployment | null = null;

// ---------------------
// DOM refs
// ---------------------
const connectBtn = document.getElementById("connectBtn")!;
const walletAddressEl = document.getElementById("walletAddress")!;

// Update
const updateBtn = document.getElementById("updateVenueBtn")!;
const updateStatus = document.getElementById("updateStatus")!;

// View Earnings
const viewEarningsBtn = document.getElementById("viewEarningsBtn")!;
const earningsInfo = document.getElementById("earningsInfo")!;

// Withdraw
const withdrawBtn = document.getElementById("withdrawBtn")!;
const withdrawStatus = document.getElementById("withdrawStatus")!;

// ---------------------
// Event Listeners
// ---------------------
connectBtn.addEventListener("click", connectWallet);
updateBtn.addEventListener("click", updateVenue);
viewEarningsBtn.addEventListener("click", viewEarnings);
withdrawBtn.addEventListener("click", withdrawEarnings);

// ---------------------
// Connect Wallet
// ---------------------
async function connectWallet() {
    if (!window.ethereum) {
        alert("Please install MetaMask or another wallet.");
        return;
    }

    walletClient = createWalletClient({
        transport: custom(window.ethereum),
    });

    const addresses = await walletClient.requestAddresses();
    account = addresses[0];

    const chainId = await walletClient.getChainId();
    currentChain = resolveChain(chainId);
    deployment = getDeployment(chainId);

    publicClient = createPublicClient({
        transport: custom(window.ethereum),
    });

    if (!deployment) {
        walletAddressEl.innerText =
            `Connected: ${account} — ⚠️ unsupported network (chain ${chainId}). Switch to Anvil or Sepolia.`;
        return;
    }

    walletAddressEl.innerText = `Connected: ${account} (${deployment.name})`;

    // Chain switches change the target proxy: reload for a clean slate.
    (window.ethereum as any).on?.("chainChanged", () => window.location.reload());
}

function requireDeployment(statusEl: HTMLElement): `0x${string}` | null {
    if (!walletClient) {
        alert("Connect wallet first");
        return null;
    }
    if (!deployment) {
        statusEl.innerText = "Unsupported network — switch to Anvil or Sepolia.";
        return null;
    }
    return deployment.CulturePassProxy;
}

// ---------------------
// UPDATE VENUE (with Database Sync)
// ---------------------
async function updateVenue() {
    try {
        const proxy = requireDeployment(updateStatus);
        if (!proxy) return;

        const venueId = (document.getElementById("updateVenueId") as HTMLInputElement).value;
        const newPrice = (document.getElementById("newEntryPrice") as HTMLInputElement).value;
        const newCapacity = (document.getElementById("newDailyCapacity") as HTMLInputElement).value;

        if (!venueId || !newPrice || !newCapacity) {
            updateStatus.innerText = "All fields are required";
            return;
        }
        if (Number(newPrice) <= 0 || Number(newCapacity) <= 0) {
            updateStatus.innerText = "Price and capacity must be > 0";
            return;
        }

        updateStatus.innerText = "Simulating transaction...";

        // ---------- SIMULATE CONTRACT ----------
        const { request } = await publicClient.simulateContract({
            address: proxy,
            abi,
            functionName: "updateVenue",
            account,
            chain: currentChain,
            args: [BigInt(venueId), BigInt(newPrice), BigInt(newCapacity)],
        });

        updateStatus.innerText = "Sending transaction...";
        const hash = await walletClient.writeContract(request);

        updateStatus.innerText = "Waiting for confirmation...";
        await publicClient.waitForTransactionReceipt({ hash });

        // ---------- READ UPDATED DATA FROM CHAIN ----------
        const updated = await publicClient.readContract({
            address: proxy,
            abi,
            functionName: "s_venues",
            args: [BigInt(venueId)],
        });

        // ---------- UPDATE SUPABASE DATABASE ----------
        const { error: dbError } = await supabase
            .from("venues")
            .update({
                entry_price: Number(updated[4]),      // new entry price from chain
                daily_capacity: Number(updated[5]),   // new daily capacity from chain
                tx_hash: hash,                        // update with latest transaction
            })
            .eq("venue_id", Number(venueId));

        if (dbError) {
            updateStatus.innerText = "⚠️ Blockchain updated, but DB sync failed: " + dbError.message;
            return;
        }

        // ---------- SUCCESS ----------
        updateStatus.innerText =
            `✅ Updated! New price: ${updated[4]}, capacity: ${updated[5]} (TX: ${hash.slice(0, 10)}…)`;

    } catch (err: any) {
        console.error(err);
        updateStatus.innerText = err.shortMessage || err.message || err.reason || "Unknown error";
    }
}

// ---------------------
// VIEW EARNINGS
// ---------------------
async function viewEarnings() {
    try {
        const proxy = requireDeployment(earningsInfo);
        if (!proxy) return;

        let walletInput = (document.getElementById("viewWallet") as HTMLInputElement).value.trim();
        const targetWallet = walletInput || account;

        if (!targetWallet || !targetWallet.startsWith("0x")) {
            earningsInfo.innerText = "Invalid wallet address";
            return;
        }

        const [tickets, ethValue] = await publicClient.readContract({
            address: proxy,
            abi,
            functionName: "getVenueEarnings",
            args: [targetWallet as `0x${string}`],
        });

        earningsInfo.innerText =
            `🎟️ Tickets: ${tickets}\n` +
            `💰 ETH value: ${formatEther(ethValue)} ETH`;

    } catch (err: any) {
        console.error(err);
        earningsInfo.innerText = "Error: " + (err.shortMessage || err.message || err.reason);
    }
}

// ---------------------
// WITHDRAW EARNINGS
// ---------------------
async function withdrawEarnings() {
    try {
        const proxy = requireDeployment(withdrawStatus);
        if (!proxy) return;

        withdrawStatus.innerText = "Simulating transaction...";

        const { request } = await publicClient.simulateContract({
            address: proxy,
            abi,
            functionName: "withdrawEarnings",
            account,
            chain: currentChain,
            args: [],
        });

        withdrawStatus.innerText = "Sending transaction...";
        const hash = await walletClient.writeContract(request);

        withdrawStatus.innerText = "Waiting for confirmation...";
        await publicClient.waitForTransactionReceipt({ hash });

        withdrawStatus.innerText = `✅ Withdrawal successful! TX: ${hash.slice(0, 10)}…`;

        // Refresh earnings display (since they are now zero)
        const [tickets, ethValue] = await publicClient.readContract({
            address: proxy,
            abi,
            functionName: "getVenueEarnings",
            args: [account],
        });
        if (tickets === 0n) {
            earningsInfo.innerText = "🎉 All earnings withdrawn!";
        } else {
            earningsInfo.innerText = `🎟️ Remaining tickets: ${tickets}\n💰 ETH value: ${formatEther(ethValue)} ETH`;
        }

    } catch (err: any) {
        console.error(err);
        withdrawStatus.innerText = err.shortMessage || err.message || err.reason || "Unknown error";
    }
}
