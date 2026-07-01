"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useSignMessage } from "wagmi";
import type { Venue } from "@/lib/venues";
import {
    REDEMPTION_TTL_SECONDS,
    attachSignature,
    type Redemption,
} from "@/lib/redemptions";

interface VenueQrModalProps {
    venue: Venue;
    visitor: `0x${string}`;
    redemption: Redemption;
    onClose: () => void;
    onUpdate: (r: Redemption) => void;
}

export function VenueQrModal({
    venue,
    visitor,
    redemption,
    onClose,
    onUpdate,
}: VenueQrModalProps) {
    const expiresAt = redemption.issuedAt + REDEMPTION_TTL_SECONDS;

    // The exact string the wallet signs and the scanner re-verifies. We keep the
    // stored one if present, so the QR stays identical across re-opens.
    const message =
        redemption.message ??
        JSON.stringify({
            app: "culturepass",
            type: "entry",
            venueId: venue.venue_id,
            venue: venue.name,
            visitor,
            issuedAt: redemption.issuedAt,
            expiresAt,
        });

    const { signMessageAsync } = useSignMessage();
    const [signature, setSignature] = useState<string | undefined>(redemption.signature);
    const [signing, setSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sign = useCallback(async () => {
        setSigning(true);
        setError(null);
        try {
            const sig = await signMessageAsync({ message });
            setSignature(sig);
            const updated = attachSignature(visitor, venue.venue_id, sig, message);
            if (updated) onUpdate(updated);
        } catch {
            setError("Signature rejected. Tap below to generate your pass.");
        } finally {
            setSigning(false);
        }
    }, [signMessageAsync, message, visitor, venue.venue_id, onUpdate]);

    // Prompt the wallet to sign the first time an unsigned pass is opened.
    const promptedRef = useRef(false);
    useEffect(() => {
        if (!signature && !promptedRef.current) {
            promptedRef.current = true;
            void sign();
        }
    }, [signature, sign]);

    // Close on Escape for keyboard users.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const qrValue = signature ? JSON.stringify({ m: message, s: signature }) : "";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl p-6 max-w-sm w-full text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                    Entry Pass
                </div>
                <h3 className="text-lg font-bold mb-1">{venue.name}</h3>

                {signature ? (
                    <>
                        <p className="text-sm text-zinc-500 mb-4">
                            Show this code at the venue to enter.
                        </p>
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-white border border-zinc-200 rounded-xl">
                                <QRCodeSVG value={qrValue} size={224} level="L" />
                            </div>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Signed by {visitor.slice(0, 6)}…{visitor.slice(-4)}
                        </p>
                        <p className="text-xs text-zinc-400 mb-4">
                            Valid until {new Date(expiresAt * 1000).toLocaleString()}
                        </p>
                    </>
                ) : (
                    <div className="py-8">
                        {signing ? (
                            <p className="text-sm text-zinc-500">
                                Waiting for wallet signature…
                            </p>
                        ) : (
                            <>
                                {error && (
                                    <p className="text-sm text-red-600 mb-3">{error}</p>
                                )}
                                <p className="text-sm text-zinc-500 mb-3">
                                    Sign with your wallet to create a tamper-proof pass.
                                </p>
                                <button
                                    onClick={() => void sign()}
                                    className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-900 text-sm font-medium"
                                >
                                    Sign to generate pass
                                </button>
                            </>
                        )}
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-zinc-100 border border-zinc-300 text-zinc-800 rounded-lg hover:bg-zinc-200 text-sm font-medium"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
