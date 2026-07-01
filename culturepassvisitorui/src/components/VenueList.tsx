"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    useAccount,
    useBlock,
    useChainId,
    useReadContract,
    useSimulateContract,
    useTransactionReceipt,
    useWaitForTransactionReceipt,
    useWriteContract,
} from "wagmi";
import { fetchActiveVenues, type Venue } from "@/lib/venues";
import { supabase } from "@/lib/supabase";
import { chainsToCulturePass, abi } from "@/lib/constants";
import { categoryLabel } from "@/utils/format";
import {
    getRedemption,
    isRedemptionActive,
    saveRedemption,
    type Redemption,
} from "@/lib/redemptions";
import { VenueQrModal } from "./VenueQrModal";

// Placeholder shown until venues set their own address (future feature).
const DEFAULT_ADDRESS = "123 Culture Street, Old Town";

// Stand-in icons per category until venues upload their own photo (future feature).
const CATEGORY_ICONS: Record<number, string> = {
    1: "🏛️", // Museum
    2: "🎭", // Theater
    3: "🖼️", // Gallery
    4: "🏰", // Heritage
};

const SECONDS_PER_DAY = 86_400n;

// Maps redeemEntry revert reasons to short, friendly text under the button.
function redeemErrorMessage(error: { message: string }): string {
    const m = error.message;
    if (m.includes("venueNotFound")) return "Not registered on-chain yet";
    if (m.includes("passExpired")) return "Pass expired";
    if (m.includes("montlyLimitReached")) return "Monthly visit limit reached";
    if (m.includes("venueClosedForTheDay")) return "Venue full for today";
    if (m.includes("burn") || m.includes("insufficient")) return "Not enough tickets";
    return "Can't redeem right now";
}

export function VenueList() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const contractAddress = chainId
        ? chainsToCulturePass[chainId]?.CulturePassProxy
        : undefined;

    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- User-level chain state shared by every row (matches redeemEntry checks) ---
    const { data: latestBlock } = useBlock({ watch: true });
    const currentDay =
        latestBlock?.timestamp !== undefined
            ? latestBlock.timestamp / SECONDS_PER_DAY
            : undefined;
    // 0n until the first block loads; eligibility is gated on currentDay (a block)
    // anyway, so we never rely on wall-clock time here (keeps render pure).
    const nowSeconds = latestBlock?.timestamp ?? 0n;
    // Chain time as a plain number for redemption validity (well within safe range).
    const nowSec = Number(nowSeconds);

    const { data: passData, refetch: refetchPass } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "getPassInfo",
        args: address ? [address] : undefined,
        query: { enabled: Boolean(contractAddress && address) },
    });
    const passInfo = passData as [number, bigint] | undefined;
    const hasActivePass =
        !!passInfo && passInfo[0] > 0 && passInfo[1] > nowSeconds;

    const { data: ticketData, refetch: refetchTickets } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "getRemainingTicketTokens",
        args: address ? [address] : undefined,
        query: { enabled: Boolean(contractAddress && address) },
    });
    const remainingTickets = ticketData as bigint | undefined;

    // Keep pass + ticket balance fresh as new blocks (e.g. a redeem tx) land.
    useEffect(() => {
        if (!latestBlock) return;
        refetchPass();
        refetchTickets();
    }, [latestBlock, refetchPass, refetchTickets]);

    // Called by a row after it redeems, so the shared balances update immediately.
    const handleRedeemed = useCallback(() => {
        refetchPass();
        refetchTickets();
    }, [refetchPass, refetchTickets]);

    const load = useCallback(async () => {
        try {
            const data = await fetchActiveVenues();
            setVenues(data);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load venues");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch; load() sets state asynchronously after awaiting Supabase.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();

        // Live updates: refresh the list whenever the venues table changes, so a
        // newly registered venue shows up for visitors without a page reload.
        const channel = supabase
            .channel("venues-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "venues" },
                () => load()
            )
            .subscribe();

        // Safety net in case Realtime isn't enabled on the Supabase project.
        const interval = setInterval(load, 15_000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [load]);

    return (
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                Venues
            </div>
            <h3 className="text-lg font-bold mb-3">Places you can visit</h3>

            {loading && <p className="text-sm text-zinc-500">Loading venues…</p>}
            {error && <p className="text-sm text-red-600">Error: {error}</p>}
            {!loading && !error && venues.length === 0 && (
                <p className="text-sm text-zinc-500">No venues available yet.</p>
            )}

            <div className="divide-y divide-zinc-200">
                {venues.map((venue) => (
                    <VenueRow
                        key={venue.venue_id}
                        venue={venue}
                        contractAddress={contractAddress}
                        userAddress={address}
                        isConnected={isConnected}
                        hasActivePass={hasActivePass}
                        remainingTickets={remainingTickets}
                        currentDay={currentDay}
                        nowSec={nowSec}
                        onRedeemed={handleRedeemed}
                    />
                ))}
            </div>
        </div>
    );
}

interface VenueRowProps {
    venue: Venue;
    contractAddress: string | undefined;
    userAddress: `0x${string}` | undefined;
    isConnected: boolean;
    hasActivePass: boolean;
    remainingTickets: bigint | undefined;
    currentDay: bigint | undefined;
    nowSec: number;
    onRedeemed: () => void;
}

function VenueRow({
    venue,
    contractAddress,
    userAddress,
    isConnected,
    hasActivePass,
    remainingTickets,
    currentDay,
    nowSec,
    onRedeemed,
}: VenueRowProps) {
    const entryPrice = BigInt(venue.entry_price);
    const dailyCapacity = BigInt(venue.daily_capacity);

    const [redemption, setRedemption] = useState<Redemption | null>(null);
    const [showQr, setShowQr] = useState(false);

    // The redeem tx must still exist on the CURRENT chain. When Anvil is reset the
    // receipt is not found, which is how we detect a fresh chain and drop the QR.
    const { data: redemptionReceipt } = useTransactionReceipt({
        hash: redemption?.txHash as `0x${string}` | undefined,
        query: { enabled: Boolean(redemption?.txHash) },
    });
    const txOnChain = Boolean(redemptionReceipt);

    // Show the QR only while inside its 1-day chain-time window, the wallet still
    // holds a pass, AND the redeem tx still exists on this chain. So restarting
    // Anvil (tx gone) drops the button back to "Redeem" — even after re-buying a
    // pass — instead of resurrecting a QR from a chain that no longer exists.
    const redeemed =
        redemption !== null &&
        isRedemptionActive(redemption, nowSec) &&
        hasActivePass &&
        txOnChain;

    // Remaining monthly visits left for this venue's category (pass-tier cap).
    const { data: visitsData, refetch: refetchVisits } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "getRemainingCategoryVisits",
        args: userAddress ? [userAddress, venue.category] : undefined,
        query: {
            enabled: Boolean(contractAddress && userAddress),
            refetchInterval: 10_000,
        },
    });
    const remainingVisits = visitsData as bigint | undefined;

    // How many visitors already entered this venue today.
    const { data: dailyData, refetch: refetchDaily } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "s_venueDailyVisits",
        args: currentDay !== undefined ? [BigInt(venue.venue_id), currentDay] : undefined,
        query: {
            enabled: Boolean(contractAddress && currentDay !== undefined),
            refetchInterval: 10_000,
        },
    });
    const dailyVisits = dailyData as bigint | undefined;

    // Each blocking reason maps to one of redeemEntry's on-chain requirements.
    const checksLoaded =
        remainingTickets !== undefined &&
        remainingVisits !== undefined &&
        dailyVisits !== undefined;

    const eligible =
        isConnected &&
        checksLoaded &&
        hasActivePass &&
        remainingTickets! >= entryPrice &&
        remainingVisits! > 0n &&
        dailyVisits! < dailyCapacity;

    // Simulate the real redeemEntry tx (only when eligible and not already redeemed).
    const { data: simulateData, error: simulateError } = useSimulateContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "redeemEntry",
        args: [BigInt(venue.venue_id)],
        query: { enabled: Boolean(contractAddress && eligible && !redeemed) },
    });

    const { writeContract, data: txHash, isPending: isWalletPending, reset } =
        useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash: txHash });

    // Sync the locally-stored QR for this wallet+venue (external system → state).
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!userAddress) {
            setRedemption(null);
            reset();
            return;
        }
        setRedemption(getRedemption(userAddress, venue.venue_id));
    }, [userAddress, venue.venue_id, reset]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // When the redeem tx confirms: ticket burned + visit counted on-chain. Record
    // the QR locally, show it, and refresh the affected balances.
    const handledHashRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (isConfirmed && txHash && handledHashRef.current !== txHash && userAddress) {
            handledHashRef.current = txHash;
            // Stamp with chain time (1-day validity) + the tx hash (chain-reset check).
            setRedemption(saveRedemption(userAddress, venue.venue_id, nowSec, txHash));
            setShowQr(true);
            refetchVisits();
            refetchDaily();
            onRedeemed();
        }
    }, [isConfirmed, txHash, userAddress, venue.venue_id, nowSec, refetchVisits, refetchDaily, onRedeemed]);

    function handleRedeem() {
        if (simulateData) writeContract(simulateData.request);
    }

    // Disabled reason (only relevant before redeeming).
    let blockedReason: string | null = null;
    if (!redeemed) {
        if (!isConnected) blockedReason = "Connect your wallet";
        else if (!checksLoaded) blockedReason = "Checking eligibility…";
        else if (!hasActivePass) blockedReason = "No active pass";
        else if (remainingTickets! < entryPrice)
            blockedReason = `Need ${venue.entry_price} tickets`;
        else if (remainingVisits! === 0n) blockedReason = "Monthly visit limit reached";
        else if (dailyVisits! >= dailyCapacity) blockedReason = "Venue full for today";
        else if (simulateError) blockedReason = redeemErrorMessage(simulateError);
    }

    const isBusy = isWalletPending || isConfirming;
    let redeemText = "Redeem";
    if (isWalletPending) redeemText = "Confirm in wallet…";
    else if (isConfirming) redeemText = "Redeeming…";

    return (
        <div className="flex items-center gap-4 py-3">
            <div className="w-12 h-12 shrink-0 rounded-lg bg-zinc-100 flex items-center justify-center text-2xl overflow-hidden">
                {venue.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={venue.image_url}
                        alt={venue.name}
                        className="w-12 h-12 object-cover"
                    />
                ) : (
                    CATEGORY_ICONS[venue.category] ?? "📍"
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{venue.name}</div>
                <div className="text-xs text-zinc-500 truncate">
                    {venue.address || DEFAULT_ADDRESS}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-400">{categoryLabel(venue.category)}</span>
                    <span className="text-xs font-medium text-zinc-600">
                        🎟️ {venue.entry_price} {venue.entry_price === 1 ? "ticket" : "tickets"}
                    </span>
                </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
                {redeemed ? (
                    <button
                        onClick={() => setShowQr(true)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                    >
                        QR Code
                    </button>
                ) : (
                    <button
                        onClick={handleRedeem}
                        disabled={!eligible || !simulateData || isBusy}
                        className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-40 hover:bg-zinc-900 text-sm font-medium"
                    >
                        {redeemText}
                    </button>
                )}
                {!redeemed && blockedReason && isConnected && (
                    <span className="text-[11px] text-zinc-400">{blockedReason}</span>
                )}
            </div>

            {showQr && redemption && userAddress && (
                <VenueQrModal
                    venue={venue}
                    visitor={userAddress}
                    redemption={redemption}
                    onClose={() => setShowQr(false)}
                    onUpdate={setRedemption}
                />
            )}
        </div>
    );
}
