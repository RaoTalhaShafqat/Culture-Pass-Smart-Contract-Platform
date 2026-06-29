"use client";

import { useAccount, useChainId, useReadContract } from "wagmi";
import { chainsToCulturePass, abi } from "@/lib/constants";
import { CATEGORY_LABELS, ALL_CATEGORIES } from "@/utils/categories";
import { useEffect } from "react";

interface VisitLimitsPanelProps {
  refreshKey?: number;
  hasActivePass: boolean;
}

export function VisitLimitsPanel({ refreshKey, hasActivePass }: VisitLimitsPanelProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
        Visit Limits
      </div>
      <h3 className="text-lg font-bold mb-3">Remaining by category</h3>
      <div>
        {ALL_CATEGORIES.map((category) => (
          <CategoryRow
            key={category}
            category={category}
            refreshKey={refreshKey}
            hasActivePass={hasActivePass}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  refreshKey,
  hasActivePass,
}: {
  category: number;
  refreshKey?: number;
  hasActivePass: boolean;
}) {
  const { address } = useAccount();
  const chainId = useChainId();

  const contractAddress = chainId ? chainsToCulturePass[chainId]?.CulturePassProxy : undefined;

  const { data, refetch } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "getRemainingCategoryVisits",
    args: address ? [address, category] : undefined,
    query: {
      enabled: Boolean(contractAddress && address),
      refetchInterval: 10_000,
    },
  });

  useEffect(() => {
    refetch();
  }, [refreshKey]);

  const remaining = data as bigint | undefined;
  const displayedRemaining = hasActivePass ? remaining ?? 0n : 0n;

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-200 last:border-0">
      <span className="text-sm">{CATEGORY_LABELS[category]}</span>
      <span className="font-bold">{displayedRemaining.toString()}</span>
    </div>
  );
}