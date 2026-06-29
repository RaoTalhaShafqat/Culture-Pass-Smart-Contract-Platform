"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract, useBlock} from "wagmi";
import { chainsToCulturePass, abi } from "@/lib/constants";
import { tierLabel } from "@/utils/format";
import { Hero } from "@/components/hero";
import { TierCard } from "@/components/TierCard";
import { ALL_TIERS } from "@/utils/tiers";
import { RenewButton } from "@/components/RenewButton";
import { VisitLimitsPanel } from "@/components/VisitLimitsPanel";

export default function Home() {

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected, chainId } = useAccount();

  const { data: latestBlock } = useBlock({
  watch: true,
  });

  const chainNow =
  latestBlock?.timestamp !== undefined
    ? Number(latestBlock.timestamp) * 1000
    : Date.now();

  const contractAddress = chainId
    ? chainsToCulturePass[chainId]?.CulturePassProxy
    : undefined;

  const { data, isLoading, error, refetch: refetchPassInfo } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "getPassInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(contractAddress && address),
    },
  });

  const { data: ticketData, refetch: refetchTickets } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "getRemainingTicketTokens",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(contractAddress && address),
    },
  });

  const remainingTickets = ticketData as bigint | undefined;
  const passInfo = data as [number, bigint] | undefined;

  // Compute if the user has an active pass (tier > 0 and not expired)
  const hasActivePass =
  !!passInfo &&
  passInfo[0] > 0 &&
  Number(passInfo[1]) * 1000 > chainNow;

  const heroTier =
  hasActivePass && passInfo
    ? tierLabel(passInfo[0])
    : "None";
  const heroTickets = remainingTickets !== undefined ? String(remainingTickets) : "0";
  const heroDays =
  hasActivePass && passInfo && passInfo[1] > 0n
    ? Math.max(
        0,
        Math.floor(
          (Number(passInfo[1]) * 1000 - chainNow) /
            (1000 * 60 * 60 * 24)
        )
      ).toString()
    : "0";

  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = useCallback(() => {
    refetchPassInfo();
    refetchTickets();
    setRefreshKey((prev) => prev + 1);
  }, [refetchPassInfo, refetchTickets]);

  useEffect(() => {
    console.log("STATE SNAPSHOT", {
      now: new Date().toISOString(),
      passInfo,
      hasActivePass,
      heroDays,
    });
  }, [passInfo, hasActivePass, heroDays]);

  useEffect(() => {
  if (!latestBlock) return;

  refetchPassInfo();
  refetchTickets();
}, [latestBlock, refetchPassInfo, refetchTickets]);

  if (!mounted) {
    return (
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-semibold">Visitor Dashboard</h1>
      </main>
    );
  }


  return (
    <main className="flex-1 p-8 max-w-4xl mx-auto">
      <Hero tier={heroTier} tickets={heroTickets} days={heroDays} />

      {!isConnected && <p className="mt-4 text-zinc-600">Connect your wallet to see your pass.</p>}
      {isConnected && isLoading && <p className="mt-4 text-zinc-600">Loading pass info...</p>}
      {isConnected && error && <p className="mt-4 text-red-600">Error: {error.message}</p>}

      <section className="mt-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
              Monthly Passes
            </div>
            <h2 className="text-xl font-bold">Choose a tier</h2>
          </div>
          {hasActivePass && passInfo && (
            <RenewButton
              currentTier={passInfo[0]}
              onRenewSuccess={handleSuccess}
            />
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ALL_TIERS.map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              onPurchaseSuccess={handleSuccess}
              hasActivePass={hasActivePass}
            />
          ))}
        </div>
      </section>
      <section className="mt-8">
        <VisitLimitsPanel refreshKey={refreshKey} hasActivePass={hasActivePass} />
      </section>
    </main>
  );
}