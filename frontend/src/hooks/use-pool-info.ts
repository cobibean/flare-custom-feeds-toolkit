'use client';

import { useReadContracts } from 'wagmi';
import { UNISWAP_V3_POOL_ABI, ERC20_ABI } from '@/lib/contracts';
import { isAddress } from 'viem';
import type { PoolInfo } from '@/lib/types';

export function usePoolInfo(poolAddress: string | undefined) {
  const isValidAddress = poolAddress && isAddress(poolAddress);

  // First, get pool's token addresses
  const { data: poolData, isLoading: poolLoading, error: poolError } = useReadContracts({
    contracts: [
      {
        address: poolAddress as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'token0',
      },
      {
        address: poolAddress as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'token1',
      },
      {
        address: poolAddress as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'slot0',
      },
    ],
    query: {
      enabled: !!isValidAddress,
    },
  });

  const token0 = poolData?.[0]?.result as `0x${string}` | undefined;
  const token1 = poolData?.[1]?.result as `0x${string}` | undefined;
  const slot0 = poolData?.[2]?.result as [bigint, number, ...unknown[]] | undefined;

  // Then, get token info
  const { data: tokenData, isLoading: tokenLoading } = useReadContracts({
    contracts: [
      {
        address: token0,
        abi: ERC20_ABI,
        functionName: 'symbol',
      },
      {
        address: token0,
        abi: ERC20_ABI,
        functionName: 'decimals',
      },
      {
        address: token1,
        abi: ERC20_ABI,
        functionName: 'symbol',
      },
      {
        address: token1,
        abi: ERC20_ABI,
        functionName: 'decimals',
      },
    ],
    query: {
      enabled: !!token0 && !!token1,
    },
  });

  const isLoading = poolLoading || tokenLoading;

  if (!isValidAddress || poolError) {
    return { data: undefined, isLoading: false, error: poolError || null };
  }

  if (isLoading || !poolData || !token0 || !token1) {
    return { data: undefined, isLoading, error: null };
  }

  if (!tokenData) {
    return { data: undefined, isLoading, error: null };
  }

  const poolInfo: PoolInfo = {
    token0: token0,
    token1: token1,
    token0Symbol: (tokenData[0]?.result as string) || 'Unknown',
    token0Decimals: (tokenData[1]?.result as number) || 18,
    token1Symbol: (tokenData[2]?.result as string) || 'Unknown',
    token1Decimals: (tokenData[3]?.result as number) || 18,
    sqrtPriceX96: slot0?.[0] || 0n,
    tick: slot0?.[1] || 0,
  };

  return { data: poolInfo, isLoading: false, error: null };
}

