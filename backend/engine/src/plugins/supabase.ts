import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// Cliente administrativo (Service Role) - Uso exclusivo en backend seguro
export const supabaseAdmin: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Helper para crear cliente con token de usuario / sesión
export function createScopedClient(jwtToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    },
  });
}
