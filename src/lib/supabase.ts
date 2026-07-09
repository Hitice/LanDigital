import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente server-only com Service Role. Inicialização preguiçosa para não
// quebrar o build enquanto as variáveis de ambiente não estão preenchidas.
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
