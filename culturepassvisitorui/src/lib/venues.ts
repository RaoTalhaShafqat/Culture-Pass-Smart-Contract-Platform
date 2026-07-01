import { supabase } from "./supabase";

// Mirrors the `venues` table the admin/venue UI writes to. The optional
// `address` / `image_url` columns are venue-managed extras that may not exist
// yet — until they do, the UI falls back to a default address and category icon.
export interface Venue {
    venue_id: number;
    name: string;
    wallet: string;
    category: number;
    entry_price: number;
    daily_capacity: number;
    active: boolean;
    address?: string | null;
    image_url?: string | null;
}

// Only venues that are currently active should be visible to visitors.
export async function fetchActiveVenues(): Promise<Venue[]> {
    const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("active", true)
        .order("venue_id", { ascending: true });

    if (error) throw error;
    return (data ?? []) as Venue[];
}
