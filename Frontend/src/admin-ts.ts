import {
    createWalletClient,
    createPublicClient,
    custom,
    parseEther,
    defineChain,
    formatEther,
    type WalletClient,
} from "viem";
import "viem/window"

import { abi, contractAddress } from "./constants-ts.ts";
import { supabase } from "./supabase";

// ---------------------
// STATE
// ---------------------
let walletClient: any;
let publicClient: any;
let account: `0x${string}`;
let currentChain: ReturnType<typeof defineChain>


const connectBtn = document.getElementById("connectBtn")!;
const walletAddressEl = document.getElementById("walletAddress")!;
const registerBtn = document.getElementById("registerBtn")!;
const removeVenueBtn = document.getElementById("removeVenueBtn")!
const reactivateVenueBtn = document.getElementById("reactivateVenueBtn")!
const setExchangeRateBtn = document.getElementById("setExchangeRateBtn")!
const setPassTierBtn = document.getElementById("setPassTierBtn")!
const viewVenueBtn = document.getElementById("viewVenueBtn")!
const viewExchangeRateBtn = document.getElementById("viewExchangeRateBtn")!
const viewPassTierBtn = document.getElementById("viewPassTierBtn")

connectBtn.addEventListener("click", connectWallet)
registerBtn.addEventListener("click", registerVenue)
removeVenueBtn.addEventListener("click", removeVenue)
reactivateVenueBtn.addEventListener("click", reactivateVenue)
setExchangeRateBtn.addEventListener("click", setExchangeRate)
setPassTierBtn.addEventListener("click", setPassTier)
viewVenueBtn.addEventListener("click", viewVenue)
viewExchangeRateBtn.addEventListener("click", viewExchangeRate)
viewPassTierBtn?.addEventListener("click", viewPassTier)

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
    currentChain = await getCurrentChain(walletClient)
    account = addresses[0];

    publicClient = createPublicClient({
        transport: custom(window.ethereum)
    });

    walletAddressEl.innerText = `Connected: ${account}`;
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
    try {
        if (!walletClient) {
            alert("Connect wallet first");
            return;
        }

        const data = {
            venueId: (document.getElementById("venueId") as HTMLInputElement).value,
            venueName: (document.getElementById("venueName") as HTMLInputElement).value,
            wallet: (document.getElementById("venueWallet") as HTMLInputElement).value,
            category: (document.getElementById("venueCategory") as HTMLSelectElement).value,
            entryPrice: (document.getElementById("entryPrice") as HTMLInputElement).value,
            dailyCapacity: (document.getElementById("dailyCapacity") as HTMLInputElement).value
        };

        // ---------------------
        // FRONTEND VALIDATION
        // ---------------------

        const registerStatus = document.getElementById("registerStatus")!
        const error = validateInput(data);
        if (error) {
            registerStatus.innerText = error;
            return;
        }

        registerStatus.innerText = "Simulating transaction...";

        // ---------------------
        // SIMULATE TX (IMPORTANT PART)
        // ---------------------
        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: "registerVenue",
            account: account,
            chain: currentChain,
            args: [
                BigInt(data.venueId),
                data.venueName,
                data.wallet as `0x${string}`,
                Number(data.category),
                BigInt(data.entryPrice),
                BigInt(data.dailyCapacity)
            ]
        });

        registerStatus.innerText = "Sending transaction...";

        // ---------------------
        // SEND TX
        // ---------------------
        const hash = await walletClient.writeContract(request);

        registerStatus.innerText = "Waiting for confirmation...";

        await publicClient.waitForTransactionReceipt({
            hash,
        });

        const { error: dbError } = await supabase
            .from("venues")
            .upsert({
                venue_id: Number(data.venueId),
                name: data.venueName,
                wallet: data.wallet,
                category: Number(data.category),
                entry_price: Number(data.entryPrice),
                daily_capacity: Number(data.dailyCapacity),
                active: true,
                tx_hash: hash,
            }, { onConflict: 'venue_id' }); // <-- Tells Supabase to use venue_id as the merge key

        if (dbError) {
            registerStatus.innerText = dbError.message;
            return;
        }

        registerStatus.innerText = "Venue registered successfully!";
    } catch (err: any) {
        console.error(err);
        const registerStatus = document.getElementById("registerStatus")!
        registerStatus.innerText = err.shortMessage || err.message;
    }
}

// ---------------------
// REMOVE VENUE
// ---------------------
async function removeVenue() {
    try {
        const venueId = (document.getElementById("removeVenueId") as HTMLInputElement).value
        const removeStatus = document.getElementById("removeStatus")!
        if (!venueId) {
            removeStatus.innerText = "Venue ID required"
            return
        }

        removeStatus.innerText = "Simulating transaction..."

        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: "removeVenue",
            account: account,
            chain: currentChain,
            args: [
                BigInt(venueId)
            ]
        })

        removeStatus.innerText = "Sending transaction..."

        const hash = await walletClient.writeContract(request)


        removeStatus.innerText = "Waiting for confirmation..."

        await publicClient.waitForTransactionReceipt({ hash });

        // ---------- UPDATE DATABASE ----------
        const { error: dbError } = await supabase
            .from("venues")
            .update({ active: false, tx_hash: hash })
            .eq("venue_id", Number(venueId));

        if (dbError) {
            removeStatus.innerText = "DB update error: " + dbError.message;
            return;
        }

        removeStatus.innerText = `Venue ${venueId} removed (deactivated) – TX: ${hash}`;
    } catch (err: any) {
        const removeStatus = document.getElementById("removeStatus")!
        removeStatus.innerText = err.shortMessage || err.message
    }
}

// ---------------------
// REACTIVATE VENUE (NEW)
// ---------------------
async function reactivateVenue() {
    try {
        const venueId = (document.getElementById("reactivateVenueId") as HTMLInputElement).value
        const reactivateStatus = document.getElementById("reactivateStatus")!
        if (!venueId) {
            reactivateStatus.innerText = "Venue ID required"
            return
        }

        if (!walletClient) {
            alert("Connect wallet first");
            return;
        }

        reactivateStatus.innerText = "Simulating transaction..."

        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: "reactivateVenue",
            account: account,
            chain: currentChain,
            args: [BigInt(venueId)]
        })

        reactivateStatus.innerText = "Sending transaction..."

        const hash = await walletClient.writeContract(request)

        reactivateStatus.innerText = "Waiting for confirmation..."

        await publicClient.waitForTransactionReceipt({ hash });

        // ---------- UPDATE DATABASE ----------
        const { error: dbError } = await supabase
            .from("venues")
            .update({ active: true, tx_hash: hash })
            .eq("venue_id", Number(venueId));

        if (dbError) {
            reactivateStatus.innerText = "DB update error: " + dbError.message;
            return;
        }

        reactivateStatus.innerText = `Venue ${venueId} reactivated – TX: ${hash}`;
    } catch (err: any) {
        const reactivateStatus = document.getElementById("reactivateStatus")!
        reactivateStatus.innerText = err.shortMessage || err.message
    }
}

// ---------------------
// SET EXCHANGE RATE
// ---------------------
async function setExchangeRate() {
    try {
        const rate = (document.getElementById("exchangeRate") as HTMLInputElement).value
        const exchangeRateStatus = document.getElementById("exchangeRateStatus")!

        if (!rate || Number(rate) <= 0) {
            exchangeRateStatus.innerText =
                "Rate must be > 0"
            return
        }

        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: "setExchangeRate",
            account: account,
            chain: currentChain,
            args: [
                parseEther(rate)
            ]
        })

        const hash = await walletClient.writeContract(request)

        exchangeRateStatus.innerText =
            `Success: ${hash}`
    } catch (err: any) {
        const exchangeRateStatus = document.getElementById("exchangeRateStatus")!
        exchangeRateStatus.innerText = err.shortMessage || err.message
    }
}

// ---------------------
// SET PASS TIERS
// ---------------------
async function setPassTier() {
    try {
        const tier = (document.getElementById("tier") as HTMLSelectElement).value

        const monthlyTickets = (document.getElementById("monthlyTickets") as HTMLInputElement).value

        const passPrice = (document.getElementById("passPrice") as HTMLInputElement).value

        const monthlyVisitCap = (document.getElementById("monthlyVisitCap") as HTMLInputElement).value

        const passTierStatus = document.getElementById("passTierStatus")!

        if (Number(monthlyTickets) <= 0) {
            passTierStatus.innerText = "Monthly tickets must be > 0"
            return
        }

        if (Number(passPrice) <= 0) {
            passTierStatus.innerText =
                "Price must be > 0"
            return
        }

        if (Number(monthlyVisitCap) <= 0) {
            passTierStatus.innerText = "Visit cap must be > 0"
            return
        }

        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: "setPassTier",
            account: account,
            chain: currentChain,
            args: [
                Number(tier),
                BigInt(monthlyTickets),
                parseEther(passPrice),
                BigInt(monthlyVisitCap)
            ]
        })

        const hash = await walletClient.writeContract(request)

        passTierStatus.innerText = `Success: ${hash}`
    } catch (err: any) {
        const passTierStatus = document.getElementById("passTierStatus")!
        passTierStatus.innerText = err.shortMessage || err.message
    }
}

// ---------------------
// VIEW REGISTERED VENUES
// ---------------------
async function viewVenue() {
    try {
        const venueId = (document.getElementById("viewVenueId") as HTMLInputElement).value

        const venue = await publicClient.readContract({
            address: contractAddress,
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

    const rate = await publicClient.readContract({
        address: contractAddress,
        abi: abi,
        functionName: "s_exchangeRate"
    }) as bigint

    const el = document.getElementById("exchangeRateInfo")
    if (!el) return

    el.innerText = `${formatEther(rate)} ETH per ticket`
}

async function viewPassTier() {
    const tier = Number((document.getElementById("viewTier") as HTMLSelectElement).value)

    const data = await publicClient.readContract({
        address: contractAddress,
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

async function getCurrentChain(client: WalletClient): Promise<ReturnType<typeof defineChain>> {
    const chainId = await client.getChainId()
    const currentChain = defineChain({
        id: chainId,
        name: "Custom Chain",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
        },
        rpcUrls: {
            default: {
                http: ["http://localhost:8545"],
            },
        },
    })
    return currentChain
}