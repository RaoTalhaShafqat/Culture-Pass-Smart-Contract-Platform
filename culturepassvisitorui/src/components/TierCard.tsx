"use client";

import { useSimulateContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { chainsToCulturePass, abi } from "@/lib/constants";
import { useReadContract, useChainId, useBlock } from "wagmi";
import { weiToEth, friendlyErrorMessage } from "@/utils/format";
import { TIER_LABELS, TIER_ACCENTS } from "@/utils/tiers";
import { useEffect, useState } from "react";

interface TierCardProps {
    tier: number; // 1 = Explorer, 2 = Enthusiast, 3 = Patron
    onPurchaseSuccess?: () => void;
    hasActivePass?: boolean;   // <-- new prop
}

export function TierCard({ tier, onPurchaseSuccess, hasActivePass }: TierCardProps) {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const contractAddress = chainId ? chainsToCulturePass[chainId]?.CulturePassProxy : undefined;

    // Fetch tier config
    const { data: tierData } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "s_passTiers",
        args: [tier],
        query: {
            enabled: Boolean(contractAddress),
            refetchInterval: 10_000
        },
    });
    const tierConfig = tierData as [bigint, bigint, bigint] | undefined;
    const priceWei = tierConfig?.[1];
    const configured = priceWei !== undefined && priceWei > 0n;

    const { data: latestBlock } = useBlock({ watch: true });

    const { data: simulateData, error: simulateError, refetch: refetchSimulate } = useSimulateContract({
     address: contractAddress as `0x${string}`,
     abi,
     functionName: "purchasePass",
     args: [tier],
     value: priceWei,
      query: { enabled: Boolean(contractAddress && configured && isConnected) },
    });

    useEffect(() => {
    if (latestBlock) {
    refetchSimulate();
    }}, [latestBlock, refetchSimulate]);

    const { writeContract, data: txHash, isPending: isWalletPending, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
    });


    const [showPurchased, setShowPurchased] = useState(false);

    // Set true the moment a purchase confirms, and notify the parent
    useEffect(() => {
        if (isConfirmed) {
            setShowPurchased(true);
            onPurchaseSuccess?.();
        }
    }, [isConfirmed, onPurchaseSuccess]);

    // Reset when disconnected or switched
    useEffect(() => {
        setShowPurchased(false);
        resetWrite();
    }, [address]);

    useEffect(() => {
     if (!hasActivePass) {
       setShowPurchased(false);
    }
    },[hasActivePass]);

    const handlePurchase = () => {
        if (!isConnected) {
            // Trigger connect flow (e.g., open connect modal)
            // You can import useConnect from wagmi
            return;
        }
        if (simulateData) writeContract(simulateData.request);
    };

    const isDisabled =
        !isConnected ||
        isWalletPending ||
        isConfirming ||
        !configured ||
        (isConnected && !simulateData) ||
        hasActivePass ||
        showPurchased;

    let buttonText = "Purchase";
    if (!isConnected) buttonText = "Connect wallet";
    else if (showPurchased) buttonText = "Purchased!";
    else if (hasActivePass) buttonText = "Already active";
    else if (isWalletPending) buttonText = "Confirm in wallet...";
    else if (isConfirming) buttonText = "Confirming...";
    console.log("TierCard", tier, { hasActivePass, configured, hasSimulateData: Boolean(simulateData), isDisabled });
    return (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="h-1" style={{ backgroundColor: TIER_ACCENTS[tier] }} />
            <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">{TIER_LABELS[tier]}</h3>
                    <span className="text-xs text-zinc-500">
                        {configured ? `${weiToEth(priceWei)} ETH / mo` : "Not configured"}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                        <div className="text-xs text-zinc-500">Tickets</div>
                        <div className="font-bold">{tierConfig ? String(tierConfig[0]) : "0"}</div>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                        <div className="text-xs text-zinc-500">Visit cap</div>
                        <div className="font-bold">{tierConfig ? String(tierConfig[2]) : "0"}</div>
                    </div>
                </div>

                <button onClick={handlePurchase} disabled={isDisabled} className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-40 hover:bg-zinc-900 text-sm font-medium">
                    {buttonText}
                </button>

                {simulateError && (
                    <p className="text-xs text-zinc-500 mt-2">{friendlyErrorMessage(simulateError)}</p>
                )}
            </div>
        </div>
    );
}