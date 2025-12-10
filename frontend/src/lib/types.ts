// Core types for the application

export type NetworkId = 'flare' | 'coston2';
export type ChainId = 14 | 114;

export interface StoredFeed {
  id: string;
  alias: string;
  network: NetworkId;
  poolAddress: `0x${string}`;
  customFeedAddress: `0x${string}`;
  priceRecorderAddress: `0x${string}`;
  token0: {
    address: `0x${string}`;
    symbol: string;
    decimals: number;
  };
  token1: {
    address: `0x${string}`;
    symbol: string;
    decimals: number;
  };
  invertPrice: boolean;
  deployedAt: string;
  deployedBy: `0x${string}`;
}

export interface StoredRecorder {
  id: string;
  address: `0x${string}`;
  network: NetworkId;
  updateInterval: number;
  deployedAt: string;
  deployedBy: `0x${string}`;
}

export interface FeedsData {
  version: string;
  feeds: StoredFeed[];
  recorders: StoredRecorder[];
}

// On-chain feed data (read from contracts)
export interface FeedOnChainData {
  latestValue: bigint;
  lastUpdateTimestamp: number;
  updateCount: number;
  feedId: string;
}

// Bot status types
export type BotStatus = 'active' | 'stale' | 'inactive' | 'unknown';

export interface PoolInfo {
  token0: `0x${string}`;
  token1: `0x${string}`;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  sqrtPriceX96: bigint;
  tick: number;
}

// Deploy form types
export interface RecorderDeployConfig {
  updateInterval: number;
}

export interface FeedDeployConfig {
  priceRecorderAddress: `0x${string}`;
  poolAddress: `0x${string}`;
  feedAlias: string;
  token0Decimals: number;
  token1Decimals: number;
  invertPrice: boolean;
}

