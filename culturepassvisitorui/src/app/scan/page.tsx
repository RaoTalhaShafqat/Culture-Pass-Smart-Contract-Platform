"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBlock } from "wagmi";
import type { Html5QrcodeScanner } from "html5-qrcode";
import { recoverMessageAddress } from "viem";
import { isScanned, markScanned } from "@/lib/scanned";

interface VerifyResult {
    ok: boolean;
    venue?: string;
    visitor?: string;
    reason?: string;
}

// Verifies a scanned QR entirely in the browser: recover the signer from the
// signature and check it matches the visitor named inside the signed message,
// and that the 1-day window hasn't passed. No backend, no contract call.
async function verifyQr(text: string, nowSec: number): Promise<VerifyResult> {
    try {
        const { m, s } = JSON.parse(text) as { m: string; s: string };
        const recovered = await recoverMessageAddress({
            message: m,
            signature: s as `0x${string}`,
        });
        const payload = JSON.parse(m) as {
            venue?: string;
            visitor?: string;
            expiresAt?: number;
        };
        const signerMatches =
            !!payload.visitor &&
            recovered.toLowerCase() === payload.visitor.toLowerCase();
        const notExpired =
            typeof payload.expiresAt === "number" ? nowSec <= payload.expiresAt : true;

        if (!signerMatches) {
            return {
                ok: false,
                venue: payload.venue,
                visitor: payload.visitor,
                reason: "Signature doesn't match the visitor",
            };
        }
        if (!notExpired) {
            return {
                ok: false,
                venue: payload.venue,
                visitor: payload.visitor,
                reason: "Pass expired",
            };
        }
        // Single-use: reject if this exact QR (its signature) was already accepted.
        if (isScanned(s)) {
            return {
                ok: false,
                venue: payload.venue,
                visitor: payload.visitor,
                reason: "Already used",
            };
        }
        markScanned(s, payload.expiresAt ?? nowSec, nowSec);
        return { ok: true, venue: payload.venue, visitor: payload.visitor };
    } catch {
        return { ok: false, reason: "Unreadable or invalid QR code" };
    }
}

function Scanner({ onDecoded }: { onDecoded: (text: string) => void }) {
    const ref = useRef<Html5QrcodeScanner | null>(null);
    const doneRef = useRef(false);

    useEffect(() => {
        let active = true;
        import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
            if (!active) return;
            const scanner = new Html5QrcodeScanner(
                "qr-reader",
                { fps: 10, qrbox: 250 },
                false
            );
            ref.current = scanner;
            scanner.render(
                (text) => {
                    // Fire once per scan: the camera reports the same QR every frame,
                    // and a second call would flag our own scan as "already used".
                    if (doneRef.current) return;
                    doneRef.current = true;
                    scanner.clear().catch(() => {});
                    onDecoded(text);
                },
                () => {} // ignored per-frame "no QR found" noise
            );
        });
        return () => {
            active = false;
            ref.current?.clear().catch(() => {});
        };
    }, [onDecoded]);

    return <div id="qr-reader" className="w-full" />;
}

export default function ScanPage() {
    const [result, setResult] = useState<VerifyResult | null>(null);

    // Judge expiry with CHAIN time (the same clock the QR's expiresAt was stamped
    // with), so advancing the chain actually expires passes. Falls back to the
    // wall clock if the chain isn't reachable (e.g. scanning off its network).
    const { data: latestBlock } = useBlock({ watch: true });
    const nowRef = useRef(0); // filled by the effect below (chain time or wall clock)
    useEffect(() => {
        nowRef.current =
            latestBlock?.timestamp !== undefined
                ? Number(latestBlock.timestamp)
                : Math.floor(Date.now() / 1000);
    }, [latestBlock]);

    const onDecoded = useCallback((text: string) => {
        void (async () => setResult(await verifyQr(text, nowRef.current)))();
    }, []);

    return (
        <main className="flex-1 p-8 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-1">Venue Scanner</h1>
            <p className="text-sm text-zinc-500 mb-6">
                Scan a visitor&apos;s entry QR (or upload a screenshot of it).
            </p>

            {!result ? (
                <Scanner onDecoded={onDecoded} />
            ) : (
                <div className="text-center bg-white border border-zinc-200 rounded-2xl p-8">
                    {result.ok ? (
                        <>
                            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-5xl mb-4">
                                ✓
                            </div>
                            <h2 className="text-xl font-bold text-emerald-700 mb-1">
                                Valid pass
                            </h2>
                        </>
                    ) : (
                        <>
                            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-5xl mb-4">
                                ✗
                            </div>
                            <h2 className="text-xl font-bold text-red-700 mb-1">
                                Invalid pass
                            </h2>
                            {result.reason && (
                                <p className="text-sm text-zinc-500 mb-1">{result.reason}</p>
                            )}
                        </>
                    )}

                    {result.venue && (
                        <p className="text-sm text-zinc-600">{result.venue}</p>
                    )}
                    {result.visitor && (
                        <p className="text-xs text-zinc-400 mb-5">
                            {result.visitor.slice(0, 6)}…{result.visitor.slice(-4)}
                        </p>
                    )}

                    <button
                        onClick={() => setResult(null)}
                        className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-900 text-sm font-medium"
                    >
                        Scan again
                    </button>
                </div>
            )}
        </main>
    );
}
