// A redeemed entry is proven by a QR the visitor keeps. The on-chain redeemEntry
// already burned the ticket + counted the visit, so we only remember locally which
// venues this wallet has a QR for, so its button shows "QR Code" instead of "Redeem".
// Validity is measured in CHAIN time (the block timestamp at redeem), not the
// browser clock, so the 1-day window tracks the same clock the contract uses.

export interface Redemption {
    venueId: number;
    visitor: string;
    issuedAt: number; // on-chain block time (unix seconds) at the moment of redeem
    // Wallet signature proving this QR belongs to `visitor`, plus the exact signed
    // message. Added once the visitor signs; the QR is only verifiable with these.
    signature?: string;
    message?: string;
    // The redeemEntry tx hash. Used to check the redemption still exists on the
    // CURRENT chain — if Anvil is reset, this tx is gone and the QR is stale.
    txHash?: string;
}

const KEY = "culturepass:redemptions";
export const REDEMPTION_TTL_SECONDS = 86_400; // QR is valid for 1 day (in chain time)

function readAll(): Redemption[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as Redemption[]) : [];
    } catch {
        return [];
    }
}

function writeAll(list: Redemption[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(list));
}

// Raw lookup for this wallet+venue. Validity is judged separately (with chain time)
// so the caller can re-check it on every new block as chain time advances.
export function getRedemption(visitor: string, venueId: number): Redemption | null {
    const match = readAll().find(
        (r) =>
            r.venueId === venueId &&
            r.visitor.toLowerCase() === visitor.toLowerCase()
    );
    return match ?? null;
}

// Still inside the 1-day window? `nowSec` must be the current CHAIN time (seconds).
// Also requires now >= issuedAt: if the chain is reset to an earlier state, time
// rewinds below issuedAt and the record is stale, not active.
export function isRedemptionActive(r: Redemption, nowSec: number): boolean {
    return nowSec >= r.issuedAt && nowSec < r.issuedAt + REDEMPTION_TTL_SECONDS;
}

// `issuedAt` is the on-chain block timestamp (seconds) when the redeem confirmed.
export function saveRedemption(
    visitor: string,
    venueId: number,
    issuedAt: number,
    txHash?: string
): Redemption {
    // Drop any prior record for this venue+visitor, then store the fresh one.
    const kept = readAll().filter(
        (r) =>
            !(
                r.venueId === venueId &&
                r.visitor.toLowerCase() === visitor.toLowerCase()
            )
    );
    const record: Redemption = { venueId, visitor, issuedAt, txHash };
    writeAll([...kept, record]);
    return record;
}

// Attach the wallet signature (and the exact signed message) to an existing record.
// Returns the updated record, or null if no matching redemption was found.
export function attachSignature(
    visitor: string,
    venueId: number,
    signature: string,
    message: string
): Redemption | null {
    const all = readAll();
    const idx = all.findIndex(
        (r) =>
            r.venueId === venueId &&
            r.visitor.toLowerCase() === visitor.toLowerCase()
    );
    if (idx === -1) return null;
    all[idx] = { ...all[idx], signature, message };
    writeAll(all);
    return all[idx];
}
