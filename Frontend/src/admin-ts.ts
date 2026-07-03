import {
    createWalletClient,
    createPublicClient,
    custom,
    parseEther,
    formatEther,
    encodeFunctionData,
    type Chain,
} from "viem";
import "viem/window";

import { abi, type ChainDeployment } from "./constants-ts.ts";
import { resolveChain, getDeployment } from "./chains.ts";
import { proposeSafeTransaction, getSafeTxStatus } from "./safe.ts";
import {
    addPending,
    listPending,
    removePending,
    applyDbAction,
    type DbAction,
} from "./pending.ts";

// ---------------------
// STATE
// ---------------------
let walletClient: any;
let publicClient: any;
let account: `0x${string}`;
let currentChain: Chain;
let deployment: ChainDeployment | null = null;
let syncTimer: number | undefined;

const connectBtn = document.getElementById("connectBtn")!;
const walletAddressEl = document.getElementById("walletAddress")!;
const networkInfoEl = document.getElementById("networkInfo");
const registerBtn = document.getElementById("registerBtn")!;
const removeVenueBtn = document.getElementById("removeVenueBtn")!
const reactivateVenueBtn = document.getElementById("reactivateVenueBtn")!
const setExchangeRateBtn = document.getElementById("setExchangeRateBtn")!
const setPassTierBtn = document.getElementById("setPassTierBtn")!
const viewVenueBtn = document.getElementById("viewVenueBtn")!
const viewExchangeRateBtn = document.getElementById("viewExchangeRateBtn")!
const viewPassTierBtn = document.getElementById("viewPassTierBtn")
const syncSafeBtn = document.getElementById("syncSafeBtn")
const safeSectionEl = document.getElementById("safeSection")
const safeMetaEl = document.getElementById("safeMeta")
const pendingSafeListEl = document.getElementById("pendingSafeList")

connectBtn.addEventListener("click", connectWallet)
registerBtn.addEventListener("click", registerVenue)
removeVenueBtn.addEventListener("click", removeVenue)
reactivateVenueBtn.addEventListener("click", reactivateVenue)
setExchangeRateBtn.addEventListener("click", setExchangeRate)
setPassTierBtn.addEventListener("click", setPassTier)
viewVenueBtn.addEventListener("click", viewVenue)
viewExchangeRateBtn.addEventListener("click", viewExchangeRate)
viewPassTierBtn?.addEventListener("click", viewPassTier)
syncSafeBtn?.addEventListener("click", () => void syncPendingSafeTxs())

// ---------------------
// CONNECT WALLET
// ---------------------
async function connectWallet() {
    if (!window.ethereum) {
        alert("Install MetaMask");
        return;
    }

    walletClient = createWalletClient({
        transport: custom(window.ethereum)
    });

    const addresses = await walletClient.requestAddresses();
    account = addresses[0];

    const chainId = await walletClient.getChainId();
    currentChain = resolveChain(chainId);
    deployment = getDeployment(chainId);

    publicClient = createPublicClient({
        transport: custom(window.ethereum)
    });

    walletAddressEl.innerText = `Connected: ${account}`;

    if (!deployment) {
        if (networkInfoEl)
            networkInfoEl.innerText = `⚠️ Unsupported network (chain ${chainId}). Switch to Anvil or Sepolia.`;
        return;
    }

    if (networkInfoEl) {
        networkInfoEl.innerText = deployment.safe
            ? `Network: ${deployment.name} — admin calls are routed through the Safe ${deployment.safe.address} (owner of the contract). Proposals need approval in the Safe app before they execute.`
            : `Network: ${deployment.name} — admin calls go directly to the contract.`;
    }

    // Safe queue UI + background sync only make sense in Safe mode.
    if (safeSectionEl) safeSectionEl.style.display = deployment.safe ? "block" : "none";
    if (deployment.safe) {
        void syncPendingSafeTxs();
        if (syncTimer === undefined) {
            syncTimer = window.setInterval(() => void syncPendingSafeTxs(), 20_000);
        }
    }

    // Chain switches change the target proxy/routing: reload for a clean slate.
    (window.ethereum as any).on?.("chainChanged", () => window.location.reload());
}

// ---------------------
// CORE: send an admin call
//   - Anvil (no Safe): simulate -> write -> receipt -> update DB (unchanged flow)
//   - Sepolia (Safe): simulate as the Safe -> propose SafeTx -> owners approve in
//     the Safe app -> the sync loop updates the DB once it executes on-chain
// ---------------------
async function sendAdminTx(opts: {
    statusEl: HTMLElement;
    functionName: string;
    args: unknown[];
    label: string;
    dbAction: DbAction;
    successText: (txHash: string) => string;
}): Promise<void> {
    const { statusEl, functionName, args, label, dbAction, successText } = opts;

    if (!walletClient || !account) {
        alert("Connect wallet first");
        return;
    }
    if (!deployment) {
        statusEl.innerText = "Unsupported network — switch to Anvil or Sepolia.";
        return;
    }
    const proxy = deployment.CulturePassProxy;

    // ----- Safe mode (Sepolia) -----
    if (deployment.safe) {
        statusEl.innerText = "Simulating as the Safe...";
        // eth_call with from = the Safe: catches onlyOwner/argument reverts
        // before anything is proposed.
        await publicClient.simulateContract({
            address: proxy,
            abi,
            functionName,
            account: deployment.safe.address,
            chain: currentChain,
            args,
        });

        statusEl.innerText = "Sign the Safe proposal in your wallet...";
        const data = encodeFunctionData({ abi, functionName, args } as any);
        const { safeTxHash, nonce, threshold } = await proposeSafeTransaction({
            walletClient,
            account,
            chainId: currentChain.id,
            cfg: deployment.safe,
            to: proxy,
            data,
        });

        addPending({
            safeTxHash,
            label,
            nonce,
            dbAction,
            proposedAt: Math.floor(Date.now() / 1000),
        });
        renderPendingList([]);

        statusEl.innerHTML =
            `Proposed to the Safe (nonce ${nonce}). Needs ${threshold} owner approval(s) — ` +
            `<a href="${deployment.safe.appUrl}" target="_blank" rel="noopener">open the Safe queue</a>. ` +
            `The database will sync automatically once it executes.`;
        return;
    }

    // ----- Direct mode (Anvil) — identical to the original flow -----
    statusEl.innerText = "Simulating transaction...";
    const { request } = await publicClient.simulateContract({
        address: proxy,
        abi,
        functionName,
        account,
        chain: currentChain,
        args,
    });

    statusEl.innerText = "Sending transaction...";
    const hash = await walletClient.writeContract(request);

    statusEl.innerText = "Waiting for confirmation...";
    await publicClient.waitForTransactionReceipt({ hash });

    const dbError = await applyDbAction(dbAction, hash);
    if (dbError) {
        statusEl.innerText = "⚠️ On-chain OK, but DB sync failed: " + dbError;
        return;
    }
    statusEl.innerText = successText(hash);
}

// ---------------------
// SAFE QUEUE SYNC: poll proposals; once executed successfully, mirror to Supabase
// ---------------------
async function syncPendingSafeTxs() {
    if (!deployment?.safe) return;
    const cfg = deployment.safe;
    const notes: string[] = [];

    for (const item of listPending()) {
        try {
            const st = await getSafeTxStatus(cfg, item.safeTxHash);
            if (!st.found) {
                notes.push(`⏳ ${item.label} — waiting for the service to index it`);
                continue;
            }
            if (!st.isExecuted) {
                notes.push(
                    `⏳ ${item.label} — ${st.confirmations}/${st.confirmationsRequired} approvals, not executed yet`
                );
                continue;
            }
            if (st.isSuccessful) {
                const dbError = await applyDbAction(item.dbAction, st.transactionHash ?? "");
                if (dbError) {
                    notes.push(`⚠️ ${item.label} — executed, but DB sync failed: ${dbError}`);
                    continue; // keep it pending so a later sync can retry the DB write
                }
                removePending(item.safeTxHash);
                notes.push(`✅ ${item.label} — executed & database updated`);
            } else {
                removePending(item.safeTxHash);
                notes.push(`❌ ${item.label} — executed but REVERTED on-chain (no DB change)`);
            }
        } catch (err: any) {
            notes.push(`⚠️ ${item.label} — sync error: ${err.message ?? err}`);
        }
    }

    renderPendingList(notes);
}

function renderPendingList(notes: string[]) {
    if (!pendingSafeListEl || !safeMetaEl) return;
    const pending = listPending();
    safeMetaEl.innerText = pending.length
        ? `${pending.length} proposal(s) waiting for Safe approval/execution.`
        : "No pending Safe proposals.";
    pendingSafeListEl.innerHTML = "";
    const lines = notes.length
        ? notes
        : pending.map((p) => `⏳ ${p.label} (nonce ${p.nonce})`);
    for (const line of lines) {
        const li = document.createElement("li");
        li.innerText = line;
        pendingSafeListEl.appendChild(li);
    }
}

// ---------------------
// VALIDATION
// ---------------------
function validateInput(data: any) {
    if (!data.venueName.trim()) return "Name required";
    if (!/^0x[a-fA-F0-9]{40}$/.test(data.wallet))
        return "Invalid wallet address";
    if (Number(data.entryPrice) <= 0)
        return "Entry price must be > 0";
    if (Number(data.dailyCapacity) <= 0)
        return "Daily capacity must be > 0";
    if (Number(data.category) === 0)
        return "Select category";

    return null;
}

// ---------------------
// REGISTER VENUE
// ---------------------
async function registerVenue() {
    const registerStatus = document.getElementById("registerStatus")!
    try {
        const data = {
            venueId: (document.getElementById("venueId") as HTMLInputElement).value,
            venueName: (document.getElementById("venueName") as HTMLInputElement).value,
            wallet: (document.getElementById("venueWallet") as HTMLInputElement).value,
            category: (document.getElementById("venueCategory") as HTMLSelectElement).value,
            entryPrice: (document.getElementById("entryPrice") as HTMLInputElement).value,
            dailyCapacity: (document.getElementById("dailyCapacity") as HTMLInputElement).value
        };

        const error = validateInput(data);
        if (error) {
            registerStatus.innerText = error;
            return;
        }

        await sendAdminTx({
            statusEl: registerStatus,
            functionName: "registerVenue",
            args: [
                BigInt(data.venueId),
                data.venueName,
                data.wallet as `0x${string}`,
                Number(data.category),
                BigInt(data.entryPrice),
                BigInt(data.dailyCapacity),
            ],
            label: `registerVenue #${data.venueId} "${data.venueName}"`,
            dbAction: {
                kind: "venue-upsert",
                row: {
                    venue_id: Number(data.venueId),
                    name: data.venueName,
                    wallet: data.wallet,
                    category: Number(data.category),
                    entry_price: Number(data.entryPrice),
                    daily_capacity: Number(data.dailyCapacity),
                },
            },
            successText: () => "Venue registered successfully!",
        });
    } catch (err: any) {
        console.error(err);
        registerStatus.innerText = err.shortMessage || err.message;
    }
}

// ---------------------
// REMOVE VENUE
// ---------------------
async function removeVenue() {
    const removeStatus = document.getElementById("removeStatus")!
    try {
        const venueId = (document.getElementById("removeVenueId") as HTMLInputElement).value
        if (!venueId) {
            removeStatus.innerText = "Venue ID required"
            return
        }

        await sendAdminTx({
            statusEl: removeStatus,
            functionName: "removeVenue",
            args: [BigInt(venueId)],
            label: `removeVenue #${venueId}`,
            dbAction: { kind: "venue-active", venueId: Number(venueId), active: false },
            successText: (hash) => `Venue ${venueId} removed (deactivated) – TX: ${hash}`,
        });
    } catch (err: any) {
        removeStatus.innerText = err.shortMessage || err.message
    }
}

// ---------------------
// REACTIVATE VENUE
// ---------------------
async function reactivateVenue() {
    const reactivateStatus = document.getElementById("reactivateStatus")!
    try {
        const venueId = (document.getElementById("reactivateVenueId") as HTMLInputElement).value
        if (!venueId) {
            reactivateStatus.innerText = "Venue ID required"
            return
        }

        await sendAdminTx({
            statusEl: reactivateStatus,
            functionName: "reactivateVenue",
            args: [BigInt(venueId)],
            label: `reactivateVenue #${venueId}`,
            dbAction: { kind: "venue-active", venueId: Number(venueId), active: true },
            successText: (hash) => `Venue ${venueId} reactivated – TX: ${hash}`,
        });
    } catch (err: any) {
        reactivateStatus.innerText = err.shortMessage || err.message
    }
}

// ---------------------
// SET EXCHANGE RATE
// ---------------------
async function setExchangeRate() {
    const exchangeRateStatus = document.getElementById("exchangeRateStatus")!
    try {
        const rate = (document.getElementById("exchangeRate") as HTMLInputElement).value

        if (!rate || Number(rate) <= 0) {
            exchangeRateStatus.innerText = "Rate must be > 0"
            return
        }

        await sendAdminTx({
            statusEl: exchangeRateStatus,
            functionName: "setExchangeRate",
            args: [parseEther(rate)],
            label: `setExchangeRate ${rate} ETH/ticket`,
            dbAction: { kind: "none" },
            successText: (hash) => `Success: ${hash}`,
        });
    } catch (err: any) {
        exchangeRateStatus.innerText = err.shortMessage || err.message
    }
}

// ---------------------
// SET PASS TIERS
// ---------------------
async function setPassTier() {
    const passTierStatus = document.getElementById("passTierStatus")!
    try {
        const tier = (document.getElementById("tier") as HTMLSelectElement).value
        const monthlyTickets = (document.getElementById("monthlyTickets") as HTMLInputElement).value
        const passPrice = (document.getElementById("passPrice") as HTMLInputElement).value
        const monthlyVisitCap = (document.getElementById("monthlyVisitCap") as HTMLInputElement).value

        if (Number(monthlyTickets) <= 0) {
            passTierStatus.innerText = "Monthly tickets must be > 0"
            return
        }
        if (Number(passPrice) <= 0) {
            passTierStatus.innerText = "Price must be > 0"
            return
        }
        if (Number(monthlyVisitCap) <= 0) {
            passTierStatus.innerText = "Visit cap must be > 0"
            return
        }

        await sendAdminTx({
            statusEl: passTierStatus,
            functionName: "setPassTier",
            args: [
                Number(tier),
                BigInt(monthlyTickets),
                parseEther(passPrice),
                BigInt(monthlyVisitCap),
            ],
            label: `setPassTier tier ${tier}`,
            dbAction: { kind: "none" },
            successText: (hash) => `Success: ${hash}`,
        });
    } catch (err: any) {
        passTierStatus.innerText = err.shortMessage || err.message
    }
}

// ---------------------
// VIEW REGISTERED VENUES
// ---------------------
async function viewVenue() {
    try {
        if (!deployment) return;
        const venueId = (document.getElementById("viewVenueId") as HTMLInputElement).value

        const venue = await publicClient.readContract({
            address: deployment.CulturePassProxy,
            abi: abi,
            functionName: "s_venues",
            args: [BigInt(venueId)]
        })

        document.getElementById("venueInfo")!.innerText = `
            ID: ${venue[0]}
            Name: ${venue[1]}
            Wallet: ${venue[2]}
            Category: ${venue[3]}
            Price: ${venue[4]}
            Capacity: ${venue[5]}
            Active: ${venue[6]}
            `
    } catch (err: any) {
        console.error(err)
    }
}

// ---------------------
// VIEW EXCHANGE RATE
// ---------------------
async function viewExchangeRate() {
    if (!deployment) return;

    const rate = await publicClient.readContract({
        address: deployment.CulturePassProxy,
        abi: abi,
        functionName: "s_exchangeRate"
    }) as bigint

    const el = document.getElementById("exchangeRateInfo")
    if (!el) return

    el.innerText = `${formatEther(rate)} ETH per ticket`
}

async function viewPassTier() {
    if (!deployment) return;
    const tier = Number((document.getElementById("viewTier") as HTMLSelectElement).value)

    const data = await publicClient.readContract({
        address: deployment.CulturePassProxy,
        abi: abi,
        functionName: "s_passTiers",
        args: [tier]
    })

    const el = document.getElementById("passTierInfo")
    if (!el) return

    const [monthlyTickets, priceETH, monthlyVisitCap] = data as [
        bigint,
        bigint,
        bigint
    ]

    el.innerText = `
    Tickets: ${monthlyTickets}
    ${formatEther(priceETH)} ETH
    Visit Cap: ${monthlyVisitCap}
    `
}
