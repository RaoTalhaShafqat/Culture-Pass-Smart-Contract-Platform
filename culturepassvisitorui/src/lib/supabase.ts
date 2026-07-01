import { createClient } from "@supabase/supabase-js";

// Browser-side Supabase client. Uses the public anon key, which is safe to ship
// to the client; row-level security on Supabase is what actually guards the data.
export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
