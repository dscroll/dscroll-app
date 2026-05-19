"use server";

import { getSupabaseAdmin, ensureTablesExist } from "@/lib/supabase";

export interface AirdropDBData {
  tld: string;
  airdrop_index: number;
  token_address: string;
  token_name?: string;
  token_symbol?: string;
  token_decimals?: number;
  total_amount: string;
  per_user_share: string;
  remaining_balance: string;
  is_active: boolean;
  is_withdrawn: boolean;
  granter: string;
  network: string;
}

export async function saveAirdrop(data: AirdropDBData) {
  try {
    await ensureTablesExist();
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("airdrops")
      .upsert(
        {
          tld: data.tld.toLowerCase(),
          airdrop_index: data.airdrop_index,
          token_address: data.token_address.toLowerCase(),
          token_name: data.token_name || "Unknown",
          token_symbol: data.token_symbol || "???",
          token_decimals: data.token_decimals ?? 18,
          total_amount: data.total_amount,
          per_user_share: data.per_user_share,
          remaining_balance: data.remaining_balance,
          is_active: data.is_active,
          is_withdrawn: data.is_withdrawn,
          granter: data.granter.toLowerCase(),
          network: data.network.toLowerCase(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tld,airdrop_index,network" }
      );

    if (error) {
      console.error("Supabase upsert error in saveAirdrop:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in saveAirdrop:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

export async function getAirdropsByTld(tld: string, network: string) {
  try {
    await ensureTablesExist();
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("airdrops")
      .select("*")
      .eq("tld", tld.toLowerCase())
      .eq("network", network.toLowerCase())
      .order("airdrop_index", { ascending: false });

    if (error) {
      console.error("Error in getAirdropsByTld:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Error in getAirdropsByTld:", error);
    return { success: false, error: error.message };
  }
}

export async function getAirdropsByGranter(granter: string, network: string) {
  try {
    await ensureTablesExist();
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("airdrops")
      .select("*")
      .eq("granter", granter.toLowerCase())
      .eq("network", network.toLowerCase())
      .order("airdrop_index", { ascending: false });

    if (error) {
      console.error("Error in getAirdropsByGranter:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Error in getAirdropsByGranter:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkUpsertAirdrops(campaigns: AirdropDBData[]) {
  if (!campaigns || campaigns.length === 0) return { success: true };

  try {
    await ensureTablesExist();
    const supabase = getSupabaseAdmin();

    const records = campaigns.map((data) => ({
      tld: data.tld.toLowerCase(),
      airdrop_index: data.airdrop_index,
      token_address: data.token_address.toLowerCase(),
      token_name: data.token_name || "Unknown",
      token_symbol: data.token_symbol || "???",
      token_decimals: data.token_decimals ?? 18,
      total_amount: data.total_amount,
      per_user_share: data.per_user_share,
      remaining_balance: data.remaining_balance,
      is_active: data.is_active,
      is_withdrawn: data.is_withdrawn,
      granter: data.granter.toLowerCase(),
      network: data.network.toLowerCase(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("airdrops")
      .upsert(records, { onConflict: "tld,airdrop_index,network" });

    if (error) {
      console.error("Error in bulkUpsertAirdrops:", error);
      return { success: false, error: error.message };
    }

    return { success: true, count: records.length };
  } catch (error: any) {
    console.error("Error in bulkUpsertAirdrops:", error);
    return { success: false, error: error.message };
  }
}
