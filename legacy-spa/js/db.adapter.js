import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export async function getDB() {
  const hasSupabase = (SUPABASE_URL && SUPABASE_ANON_KEY);
  if (hasSupabase) {
    const mod = await import('./db.supabase.js');
    return mod.db;
  } else {
    const mod = await import('./db.js');
    return mod.db;
  }
}

