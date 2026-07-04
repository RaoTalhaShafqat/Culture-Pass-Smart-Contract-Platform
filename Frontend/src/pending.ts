// Pending Safe proposals whose Supabase side-effect must run only AFTER the
// Safe transaction is approved + executed on-chain. Stored in localStorage on
// the admin's browser; a sync loop polls the Safe service and applies the DB
// action once the execution succeeds.

import { supabase } from "./supabase";

export type DbAction =
    | {
          kind: "venue-upsert";
          row: {
              venue_id: number;
              name: string;
              wallet: string;
              category: number;
              entry_price: number;
              daily_capacity: number;
          };
      }
    | { kind: "venue-active"; venueId: number; active: boolean }
    | { kind: "none" };

export interface PendingSafeTx {
    safeTxHash: string;
    label: string; // human-readable, e.g. 'registerVenue #3 "East Side Gallery"'
    nonce: number;
    dbAction: DbAction;
    proposedAt: number; // unix seconds
}

const KEY = "culturepass:pending-safe-txs";

export function listPending(): PendingSafeTx[] {
    try {
        const raw = window.localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as PendingSafeTx[]) : [];
    } catch {
        return [];
    }
}

function writeAll(items: PendingSafeTx[]) {
    window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function addPending(item: PendingSafeTx) {
    writeAll([...listPending().filter((p) => p.safeTxHash !== item.safeTxHash), item]);
}

export function removePending(safeTxHash: string) {
    writeAll(listPending().filter((p) => p.safeTxHash !== safeTxHash));
}

// Mirror the executed Safe transaction into Supabase. `txHash` is the real
// on-chain execution hash reported by the Safe service.
export async function applyDbAction(action: DbAction, txHash: string): Promise<string | null> {
    if (action.kind === "venue-upsert") {
        const { error } = await supabase
            .from("venues")
            .upsert(
                { ...action.row, active: true, tx_hash: txHash },
                { onConflict: "venue_id" }
            );
        return error ? error.message : null;
    }
    if (action.kind === "venue-active") {
        const { error } = await supabase
            .from("venues")
            .update({ active: action.active, tx_hash: txHash })
            .eq("venue_id", action.venueId);
        return error ? error.message : null;
    }
    return null;
}
