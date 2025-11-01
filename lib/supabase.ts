import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side client without per-user auth (única instancia).
export function supabaseServer() {
  if (!url || !anon) throw new Error('Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, anon, {
    auth: { persistSession: false }
  });
}
