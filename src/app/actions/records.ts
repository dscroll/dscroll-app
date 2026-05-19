"use server";

import { verifyMessage } from "viem";
import { getSupabaseAdmin, ensureTablesExist } from "@/lib/supabase";
import { sdk, initializeSDK } from "@/lib/odude";
import config from "@/config/config.json";

const allowedTlds = new Set((config.domains || []).map((d: any) => d.tld.toLowerCase()));

function isSubNameSupported(subname: string) {
  if (!subname || !subname.includes("@")) return false;
  const parts = subname.split("@");
  const tld = parts[parts.length - 1].toLowerCase();
  return allowedTlds.has(tld);
}

export interface RecordData {
  subname: string;
  name?: string;
  email?: string;
  walletAddress: string;
  signature?: string;
  message?: string;
  odude?: boolean;
  tokenid?: string;
  tokenuri?: string;
}

export async function saveRecord(data: RecordData) {
  const { subname, name, email, walletAddress, signature, message, odude } = data;
  console.log(`[saveRecord] Saving subname: ${subname}, odude: ${odude}`);

  if (!isSubNameSupported(subname)) {
    return { success: false, error: "TLD not supported." };
  }

  try {
    // 0. Ensure tables exist
    await ensureTablesExist();

    // 1. Verify Signature
    if (!signature || !message) {
      return { success: false, error: "Missing signature or message for verification." };
    }

    const isSignatureValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });

    if (!isSignatureValid) {
      return { success: false, error: "Invalid signature. Wallet verification failed." };
    }

    // 2. Verify Ownership via SDK
    initializeSDK();
    const nameInfo = await sdk.getNameInfo(subname);
    
    if (!nameInfo || !nameInfo.exists) {
      return { success: false, error: "Subname not found on-chain." };
    }

    if (nameInfo.owner.toLowerCase() !== walletAddress.toLowerCase()) {
      return { success: false, error: "You are not the owner of this subname." };
    }

    // 3. Save to Supabase
    const supabase = getSupabaseAdmin();
    
    // Attempt to upsert
    const { error: upsertError } = await supabase
      .from("records")
      .upsert(
        {
          subname: subname.toLowerCase(),
          wallet_address: walletAddress,
          name,
          email,
          signature,
          odude: odude ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "subname" }
      );

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError);
      
      // Handle missing table
      if (upsertError.code === "42P01") {
        return { 
          success: false, 
          error: "Database table 'records' does not exist. Please run the setup SQL in your Supabase dashboard.",
          setupRequired: true 
        };
      }
      
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in saveRecord:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

export async function getRecord(subname: string) {
  try {
    // 0. Ensure tables exist
    await ensureTablesExist();

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("subname", subname.toLowerCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") return { success: true, data: null }; // Not found
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncRecords(records: { subname: string; walletAddress: string; tokenid: string }[]) {
  const filteredRecords = (records || []).filter(r => isSubNameSupported(r.subname));
  if (filteredRecords.length === 0) return { success: true, count: 0 };

  try {
    await ensureTablesExist();
    const supabase = getSupabaseAdmin();

    // The user wants: "If old subname already exist in table, don't insert new."
    // We can use upsert with a check or just fetch existing and filter.
    // However, a simple upsert with 'onConflict' and only inserting if it doesn't exist 
    // is tricky in Supabase JS client without raw SQL.
    // Let's fetch existing subnames first.
    
    const subnames = filteredRecords.map(r => r.subname.toLowerCase());
    const { data: existingRecords, error: fetchError } = await supabase
      .from("records")
      .select("subname")
      .in("subname", subnames);

    if (fetchError) throw fetchError;

    const existingSubnames = new Set(existingRecords?.map(r => r.subname) || []);
    const newRecords = filteredRecords.filter(r => !existingSubnames.has(r.subname)).map(r => ({
      subname: r.subname.toLowerCase(),
      wallet_address: r.walletAddress,
      tokenid: r.tokenid,
      updated_at: new Date().toISOString()
    }));

    if (newRecords.length === 0) return { success: true, count: 0 };

    const { error: insertError } = await supabase
      .from("records")
      .insert(newRecords);

    if (insertError) throw insertError;

    return { success: true, count: newRecords.length };
  } catch (error: any) {
    console.error("Error in syncRecords:", error);
    return { success: false, error: error.message };
  }
}

export async function updateRecordSync(subname: string, walletAddress: string, tokenid: string, tokenuri: string) {
  if (!isSubNameSupported(subname)) {
    return { success: false, error: "TLD not supported." };
  }

  try {
    await ensureTablesExist();
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("records")
      .upsert({
        subname: subname.toLowerCase(),
        wallet_address: walletAddress,
        tokenid,
        tokenuri,
        updated_at: new Date().toISOString()
      }, { onConflict: "subname" });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateRecordSync:", error);
    return { success: false, error: error.message };
  }
}

export async function getWalletRecords(walletAddress: string) {
  if (!walletAddress) return { success: false, error: "Wallet address is required." };

  try {
    await ensureTablesExist();
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from("records")
      .select("subname, tokenid")
      .or(`wallet_address.eq.${walletAddress},wallet_address.eq.${walletAddress.toLowerCase()}`);

    if (error) {
      console.error("Error in getWalletRecords:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Error in getWalletRecords:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

