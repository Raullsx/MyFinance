import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjfjpivlqoucmlcadjfk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_hRIq389g-2186S1MPaHmoA_bWIQ9lxk';

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
