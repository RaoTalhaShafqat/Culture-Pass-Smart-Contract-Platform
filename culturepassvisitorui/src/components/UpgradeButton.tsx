"use client";

import { useEffect, useState } from "react";
import {
    useAccount,
    useChainId,
    useReadContract,
    useSimulateContract,
    useWaitForTransactionReceipt,
    useWriteContract,
} from "wagmi";
import { chainsToCulturePass, abi } from "@/lib/constants";
import { ALL_TIERS, TIER_LABELS } from "@/utils/tiers";
import { weiToEth, friendlyErrorMessage } from "@/utils/format";

interface UpgradeButtonProps {
    currentTier: number; // tier the wallet currently owns
    remainingDays: number; // days left on the current pass
    onUpgradeSuccess?: () => void;
}

export function UpgradeButton({
    currentTier,
    remainingDays,
    onUpgradeSuccess,
}: UpgradeButtonProps) {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const contractAddress = chainId
        ? chainsToCulturePass[chainId]?.CulturePassProxy
        : undefined;

    // Only tiers above the current one are upgrade targets.
    const higherTiers = ALL_TIERS.filter((t) => t > currentTier);
    const [rawTarget, setRawTarget] = useState<number>(0);
    // Derived so it stays valid without an effect if currentTier changes.
    const target = rawTarget > currentTier ? rawTarget : higherTiers[0] ?? 0;

    // Policy: upgrading is only allowed in the 16–30 day window — blocked when the
    // pass is near expiry (≤15 days) or has been renewed (>30 days, since a fresh
    // purchase grants at most 30 days).
    const policyReason =
        remainingDays <= 15
            ? "Not available near expiry (≤15 days left)"
            : remainingDays > 30
              ? "Not available after renewing"
              : null;

    // priceETH is index 1 of s_passTiers. Upgrade costs the difference.
    const { data: curData } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "s_passTiers",
        args: [currentTier],
        query: { enabled: Boolean(contractAddress) },
    });
    const { data: tgtData } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "s_passTiers",
        args: [target],
        query: { enabled: Boolean(contractAddress && target > 0) },
    });
    const curPrice = (curData as [bigint, bigint, bigint] | undefined)?.[1];
    const tgtPrice = (tgtData as [bigint, bigint, bigint] | undefined)?.[1];
    const priceDiff =
        curPrice !== undefined && tgtPrice !== undefined && tgtPrice >= curPrice
            ? tgtPrice - curPrice
            : undefined;

    const { data: simulateData, error: simulateError } = useSimulateContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "upgradePass",
        args: [target],
        value: priceDiff,
        query: {
            enabled: Boolean(
                contractAddress &&
                    isConnected &&
                    target > currentTier &&
                    priceDiff !== undefined &&
                    !policyReason
            ),
        },
    });

    const { writeContract, data: txHash, isPending, reset } = useWriteContract();
    const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    useEffect(() => {
        if (isSuccess) onUpgradeSuccess?.();
    }, [isSuccess, onUpgradeSuccess]);

    // Reset transaction state whenever the connected wallet changes.
    useEffect(() => {
        reset();
    }, [address, reset]);

    if (higherTiers.length === 0) return null; // already on the top tier

    const disabled =
        !isConnected || isPending || isMining || !simulateData || policyReason !== null;
    let label = "Upgrade";
    if (isPending) label = "Confirm in wallet…";
    else if (isMining) label = "Upgrading…";
    else if (priceDiff !== undefined) label = `Upgrade +${weiToEth(priceDiff)} ETH`;

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
                <select
                    value={target}
                    onChange={(e) => setRawTarget(Number(e.target.value))}
                    className="text-sm border border-zinc-300 rounded-lg px-2 py-2 bg-white"
                >
                    {higherTiers.map((t) => (
                        <option key={t} value={t}>
                            {TIER_LABELS[t]}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => simulateData && writeContract(simulateData.request)}
                    disabled={disabled}
                    className="px-4 py-2 bg-zinc-100 border border-zinc-300 text-zinc-800 rounded-lg disabled:opacity-40 hover:bg-zinc-200 text-sm font-medium whitespace-nowrap"
                >
                    {label}
                </button>
            </div>
            {policyReason ? (
                <p className="text-xs text-zinc-500">{policyReason}</p>
            ) : (
                simulateError && (
                    <p className="text-xs text-zinc-500">
                        {friendlyErrorMessage(simulateError)}
                    </p>
                )
            )}
        </div>
    );
}
