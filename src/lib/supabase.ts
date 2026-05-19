import { createClient } from '@supabase/supabase-js';
import type { Pool } from 'pg';
import { CONFIG } from '@/config/config';

const supabaseUrl = CONFIG.supabase.url;
const supabaseAnonKey = CONFIG.supabase.anonKey;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing in configuration.");
}

// Client for use in browser or basic server operations
// Use a conditional to prevent crashing during build if env vars are missing
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;

// Client with service role for admin operations (server-side only)
export const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    throw new Error("Admin client should only be used on the server side.");
  }
  
  if (!supabaseUrl) {
    throw new Error("Supabase URL is missing. Please complete the setup.");
  }
  
  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
};

// Database Pool for DDL operations (server-side only)
let pool: Pool | null = null;

export const getDbPool = () => {
  if (typeof window !== 'undefined') return null;
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error("DATABASE_URL is missing. Automatic table creation will fail.");
      return null;
    }
    const { Pool } = require('pg');
    
    // Robust parsing for special characters in passwords
    const parts = connectionString.match(/^(postgresql|postgres):\/\/([^:]+):(.+)@([^/:]+)(?::(\d+))?\/([^?]+)(?:\?(.+))?$/);
    
    if (parts) {
      const [_, protocol, user, password, host, port, database, query] = parts;
      const hasSsl = query?.includes("sslmode=require") || query?.includes("ssl=true");
      
      pool = new Pool({
        user,
        password: decodeURIComponent(password),
        host,
        port: port ? parseInt(port) : 5432,
        database,
        ssl: hasSsl ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    } else {
      pool = new Pool({ 
        connectionString,
        connectionTimeoutMillis: 10000,
      });
    }
  }
  return pool;
};

export const ensureTablesExist = async () => {
  const db = getDbPool();
  if (!db) return;

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subname TEXT UNIQUE NOT NULL,
        wallet_address TEXT NOT NULL,
        name TEXT,
        email TEXT,
        signature TEXT,
        odude BOOLEAN DEFAULT false,
        tokenid TEXT,
        tokenuri TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS airdrops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tld TEXT NOT NULL,
        airdrop_index INTEGER NOT NULL,
        token_address TEXT NOT NULL,
        token_name TEXT,
        token_symbol TEXT,
        token_decimals INTEGER DEFAULT 18,
        total_amount TEXT NOT NULL,
        per_user_share TEXT NOT NULL,
        remaining_balance TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_withdrawn BOOLEAN DEFAULT false,
        granter TEXT NOT NULL,
        network TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(tld, airdrop_index, network)
      );
    `);

    // Migration: add tokenid and tokenuri columns if they don't exist
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'records' AND column_name = 'tokenid'
        ) THEN
          ALTER TABLE records ADD COLUMN tokenid TEXT;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'records' AND column_name = 'tokenuri'
        ) THEN
          ALTER TABLE records ADD COLUMN tokenuri TEXT;
        END IF;
      END
      $$;
    `);

    // Migration: add odude column if it doesn't exist (for existing tables)
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'records' AND column_name = 'odude'
        ) THEN
          ALTER TABLE records ADD COLUMN odude BOOLEAN DEFAULT false;
        END IF;
      END
      $$;
    `);
    
    // Check if RLS is enabled (optional automation)
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'records' AND policyname = 'Public profiles are viewable by everyone'
        ) THEN
          ALTER TABLE records ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "Public profiles are viewable by everyone" ON records FOR SELECT USING (true);
        END IF;
      END
      $$;
    `);

    // RLS and policy for airdrops
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'airdrops' AND policyname = 'Public airdrops are viewable by everyone'
        ) THEN
          ALTER TABLE airdrops ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "Public airdrops are viewable by everyone" ON airdrops FOR SELECT USING (true);
        END IF;
      END
      $$;
    `);
  } catch (err) {
    console.error("Failed to ensure tables exist:", err);
  }
};
