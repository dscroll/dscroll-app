import { NextResponse } from 'next/server';
import configData from '@/config/config.json';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tld: string }> }
) {
  const { tld } = await params;
  
  // Find the domain configuration for the given TLD
  const domainConfig = configData.domains.find(d => d.tld.toLowerCase() === tld.toLowerCase());

  if (!domainConfig) {
    return NextResponse.json({ error: 'TLD not supported' }, { 
      status: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  // Get the base URL from the request to construct absolute image URLs
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // Construct the OpenSea compatible JSON metadata
  const metadata = {
    name: domainConfig.title,
    description: domainConfig.description || `Official ${domainConfig.title} NFT.`,
    image: domainConfig.nft_image.startsWith('http') 
      ? domainConfig.nft_image 
      : `${baseUrl}${domainConfig.nft_image}`,
    external_url: domainConfig.external_url || baseUrl,
    attributes: [
      {
        trait_type: 'TLD',
        value: domainConfig.tld
      },
      {
        trait_type: 'Cost',
        value: `${domainConfig.cost} ${domainConfig.erc20_name || 'ETH'}`
      },
      {
        trait_type: 'Chain',
        value: configData.api.chain_name
      }
    ]
  };


  return NextResponse.json(metadata, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
