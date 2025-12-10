import { NextRequest, NextResponse } from 'next/server';

// FDC Verifier URLs by chain
const VERIFIER_URLS = {
  14: 'https://fdc-verifiers-mainnet.flare.network/verifier/flr/EVMTransaction/prepareRequest',
  114: 'https://fdc-verifiers-testnet.flare.network/verifier/c2flr/EVMTransaction/prepareRequest',
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId, ...requestBody } = body;

    const verifierUrl = VERIFIER_URLS[chainId as keyof typeof VERIFIER_URLS];
    if (!verifierUrl) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${chainId}` },
        { status: 400 }
      );
    }

    const response = await fetch(verifierUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': '00000000-0000-0000-0000-000000000000',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Verifier error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('FDC prepare request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

