"use client";

import { useEffect, useState } from "react";
import {
    useAccount,
    useChainId,
    useReadContract,
    useSimulateContract,
    useWriteContract,
    useWaitForTransactionReceipt,
} from "wagmi";
import { chainsToCulturePass, abi } from "@/lib/constants";
import { friendlyErrorMessage } from "@/utils/format";

interface RenewButtonProps {
    currentTier: number; // the tier the wallet currently owns, from getPassInfo
    onRenewSuccess?: () => void;
}

export function RenewButton({ currentTier, onRenewSuccess }: RenewButtonProps) {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const contractAddress = chainId ? chainsToCulturePass[chainId]?.CulturePassProxy : undefined;

    // Look up the price for whatever tier this wallet currently owns
    const { data: tierData } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "s_passTiers",
        args: [currentTier],
        query: {
            enabled: Boolean(contractAddress && currentTier > 0),
            refetchInterval: 10_000
        },
    });

    const tierConfig = tierData as [bigint, bigint, bigint] | undefined;
    const priceWei = tierConfig?.[1];

    const { data: simulateData, error: simulateError } = useSimulateContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "renewPass",
        args: [],
        value: priceWei,
        query: { enabled: Boolean(contractAddress && priceWei && isConnected) },
    });

    const {
        writeContract,
        data: txHash,
        isPending: isWalletPending,
        reset: resetWrite,
    } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    const [showRenewed, setShowRenewed] = useState(false);

    // Mark success and notify parent the moment the renewal confirms
    useEffect(() => {
        if (isConfirmed) {
            setShowRenewed(true);
            onRenewSuccess?.();

            const timer = setTimeout(() => setShowRenewed(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [isConfirmed, onRenewSuccess]);

    // Reset all transaction state whenever the connected wallet changes
    useEffect(() => {
        setShowRenewed(false);
        resetWrite();
    }, [address]);

    function handleRenew() {
        if (!simulateData) return;
        writeContract(simulateData.request);
    }

    const isDisabled = !isConnected || isWalletPending || isConfirming || !simulateData;

    let buttonText = "Renew Pass";
    if (isWalletPending) buttonText = "Confirm in wallet...";
    else if (isConfirming) buttonText = "Confirming...";

    return (
        <div>
            <button
                onClick={handleRenew}
                disabled={isDisabled}
                className="px-4 py-2 bg-zinc-100 border border-zinc-300 text-zinc-800 rounded-lg disabled:opacity-40 hover:bg-zinc-200 text-sm font-medium"
            >
                {buttonText}
            </button>
            {simulateError && (
                <p className="text-xs text-zinc-500 mt-2">{friendlyErrorMessage(simulateError)}</p>
            )}
            {showRenewed && (
                <p className="text-xs text-green-600 mt-2">Successfully renewed!</p>
            )}
        </div>
    );
}