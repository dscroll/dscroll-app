import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdmin } from '@/lib/supabase';

/**
 * API Route: /api/name/[subname]
 * Returns NFT-compatible metadata for a subname record.
 * Example: /api/name/hello@apple
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subname: string }> }
) {
  // Extract subname from params. Note: Next.js decodes %40 back to @
  const { subname } = await params;

  if (!subname || !subname.includes('@')) {
    return NextResponse.json(
      { error: 'Invalid subname format. Expected label@tld' },
      { status: 400 }
    );
  }

  const [label, tld] = subname.split('@');

  try {
    // Use admin client to bypass RLS and ensure all columns are accessible
    const supabaseAdmin = getSupabaseAdmin();
    
    // Fetch record from Supabase 'records' table
    // Use case-insensitive match or lowercase to be robust
    const { data, error } = await supabaseAdmin
      .from('records')
      .select('*')
      .eq('subname', subname.toLowerCase())
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Subname record not found in database' },
        { status: 404 }
      );
    }

    const origin = request.nextUrl.origin;

    // Construct image URL based on TLD (Pattern: /nft_{tld}.jpg)
    const imageUrl = `${origin}/nft_${tld}.jpg`;

    // Construct metadata based on the requested mockup structure
    const metadata = {
      name: subname,
      description: data.name ? `Digital Identity for ${data.name} (${subname})` : `DScroll Digital Identity for ${subname}`,
      image: imageUrl,
      attributes: [
        {
          trait_type: "Domain",
          value: subname
        },
        {
          trait_type: "Level",
          value: "2"
        },
        {
          trait_type: "Length",
          value: subname.length
        }
      ],
      records: {
        display_name: data.name || "",
        email: data.email || "",
        website: "",
        phone: "",
        social: {
          twitter: "",
          telegram: "",
          discord: "",
          youtube: "",
          facebook: "",
          instagram: ""
        },
        crypto: {
          matic: "",
          fil: "",
          sol: "",
          bsc: "",
          eth: data.wallet_address || ""
        },
        notes: ""
      },
      configuration: {
        type: "odude",
        odude_enabled: !!data.odude
      }
    };

    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=59'
      }
    });
  } catch (err) {
    console.error('Error serving subname metadata:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
