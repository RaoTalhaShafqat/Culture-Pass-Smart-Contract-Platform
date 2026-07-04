"use client";

import { useEffect, useState } from "react";
import {
    useAccount,
    useChainId,
    useSimulateContract,
    useWaitForTransactionReceipt,
    useWriteContract,
} from "wagmi";
import { chainsToCulturePass, abi } from "@/lib/constants";
import { friendlyErrorMessage } from "@/utils/format";

interface CancelMembershipButtonProps {
    onCancelSuccess?: () => void;
}

export function CancelMembershipButton({ onCancelSuccess }: CancelMembershipButtonProps) {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const contractAddress = chainId
        ? chainsToCulturePass[chainId]?.CulturePassProxy
        : undefined;

    // Two-step: first click arms, second click actually cancels.
    const [armed, setArmed] = useState(false);

    const { data: simulateData, error: simulateError } = useSimulateContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "cancelMembership",
        args: [],
        query: { enabled: Boolean(contractAddress && isConnected) },
    });

    const { writeContract, data: txHash, isPending, reset } = useWriteContract();
    const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    useEffect(() => {
        if (isSuccess) onCancelSuccess?.();
    }, [isSuccess, onCancelSuccess]);

    // Reset the pending tx whenever the connected wallet changes.
    useEffect(() => {
        reset();
    }, [address, reset]);

    // Auto-disarm the confirm state after a few seconds if not acted on.
    useEffect(() => {
        if (!armed) return;
        const timer = setTimeout(() => setArmed(false), 4000);
        return () => clearTimeout(timer);
    }, [armed]);

    function handleClick() {
        if (!armed) {
            setArmed(true);
            return;
        }
        if (simulateData) writeContract(simulateData.request);
    }

    const disabled = !isConnected || isPending || isMining || (armed && !simulateData);
    let label = "Cancel membership";
    if (isPending) label = "Confirm in wallet…";
    else if (isMining) label = "Cancelling…";
    else if (armed) label = "Confirm cancel";

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleClick}
                disabled={disabled}
                className={`px-4 py-2 rounded-lg border disabled:opacity-40 text-sm font-medium whitespace-nowrap ${
                    armed
                        ? "bg-red-600 border-red-600 text-white hover:bg-red-700"
                        : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                }`}
            >
                {label}
            </button>
            {armed && simulateError && (
                <p className="text-xs text-zinc-500">{friendlyErrorMessage(simulateError)}</p>
            )}
        </div>
    );
}
