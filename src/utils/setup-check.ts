import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "@/config/config";
// Type-only import is safe for the bundler
import type { Client as ClientType } from "pg";
import { ensureTablesExist } from "@/lib/supabase";
import dns from "dns";

// Set default DNS resolution to prioritize IPv4 to avoid IPv6 timeout issues in some environments
if (typeof window === 'undefined' && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

export interface SetupStatus {
  walletConnect: boolean;
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  supabaseServiceKey: boolean;
  databaseUrl: boolean;
  isAllConfigured: boolean;
  isConnected?: boolean;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const status = {
    walletConnect: !!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && 
                   process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID !== "your_project_id" && 
                   process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.length > 10,
    supabaseUrl: !!CONFIG.supabase.url && 
                 CONFIG.supabase.url !== "your_supabase_project_url" && 
                 CONFIG.supabase.url.includes("supabase.co"),
    supabaseAnonKey: !!CONFIG.supabase.anonKey && 
                     CONFIG.supabase.anonKey !== "your_supabase_anon_key" && 
                     CONFIG.supabase.anonKey.length > 20,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY && 
                        process.env.SUPABASE_SERVICE_ROLE_KEY !== "your_supabase_service_role_key" && 
                        process.env.SUPABASE_SERVICE_ROLE_KEY.length > 20,
    databaseUrl: !!process.env.DATABASE_URL && 
                 !process.env.DATABASE_URL.includes("[YOUR-PASSWORD]") && 
                 process.env.DATABASE_URL.includes("postgres"),
  };

  const isAllConfigured = Object.values(status).every(Boolean);

  return {
    ...status,
    isAllConfigured,
  };
}

export async function validateSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = process.env.DATABASE_URL;

  if (!url || !key || url.includes("your_") || key.includes("your_")) {
    return { success: false, message: "Missing or invalid Supabase API credentials" };
  }

  // 1. Validate API Connectivity
  try {
    const supabase = createClient(url, key);
    const { error: apiError, status } = await supabase.from("_ping_").select("*").limit(1);
    
    if (apiError && (status === 401 || status === 403)) {
      return { success: false, message: "Invalid Supabase Service Role Key" };
    }
    if (apiError && apiError.message?.includes("Failed to fetch")) {
      return { success: false, message: "Invalid Supabase URL or network error" };
    }
    // Note: status 404 (table not found) is acceptable - it proves the connection works
    // Note: PGRST301 (table not found) is acceptable as proof of connection
  } catch (err: any) {
    return { success: false, message: "Supabase API connection failed: " + err.message };
  }

  // 2. Validate Database Connectivity
  if (!dbUrl || dbUrl.includes("[YOUR-PASSWORD]")) {
    return { success: false, message: "Missing or invalid DATABASE_URL" };
  }

  // Dynamically require pg only on the server
  const { Client } = require("pg");
  
  let client;
  try {
    // Robust parsing for DATABASE_URL to handle special characters in passwords
    // We extract components manually to bypass URL encoding issues with the pg connection string parser
    const parts = dbUrl.match(/^(postgresql|postgres):\/\/([^:]+):(.+)@([^/:]+)(?::(\d+))?\/([^?]+)(?:\?(.+))?$/);
    
    if (parts) {
      const [_, protocol, user, password, host, port, database, query] = parts;
      const hasSsl = query?.includes("sslmode=require") || query?.includes("ssl=true");
      
      client = new Client({
        user,
        password: decodeURIComponent(password), // Handle both encoded and raw passwords
        host,
        port: port ? parseInt(port) : 5432,
        database,
        ssl: hasSsl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000, // 10 seconds timeout
      });
    } else {
      client = new Client({ 
        connectionString: dbUrl,
        connectionTimeoutMillis: 10000,
      });
    }

    await client.connect();
    await client.query("SELECT 1");
    await client.end();
  } catch (err: any) {
    let extraMsg = "";
    if (err.message?.includes("ETIMEDOUT")) {
      extraMsg = " (Network timeout: Ensure your firewall allows port 5432/6543 and try using the IPv4 pooler URL)";
    } else if (err.message?.includes("password authentication failed")) {
      extraMsg = " (Authentication failed: Double-check your database password in .env)";
    }
    
    return { 
      success: false, 
      message: "Database connection failed" + extraMsg + ": " + err.message 
    };
  }

  // 3. Ensure Tables Exist
  try {
    await ensureTablesExist();
  } catch (err: any) {
    return { success: false, message: "Connected, but failed to create tables: " + err.message };
  }

  return { success: true, message: "All systems verified! API connected, Database accessible, and Tables ready." };
}
