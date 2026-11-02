import path from 'path';
import dotenv from 'dotenv';

// Load .env.local from project root (C:\Fuentes\ETI\.env.local)
const envPath = path.resolve(__dirname, '../../../.env.local');
dotenv.config({ path: envPath });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  engineAllowedOrigins: process.env.ENGINE_ALLOWED_ORIGINS || 'http://localhost:3000',
  engineTickSecret: process.env.ENGINE_TICK_SECRET || '',
};

if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
  console.warn('⚠️ ADVERTENCIA: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidos en .env.local');
}
