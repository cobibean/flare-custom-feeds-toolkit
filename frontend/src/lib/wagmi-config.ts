import { http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { type Chain } from 'viem';

// Define Flare Mainnet
export const flare = {
  id: 14,
  name: 'Flare',
  nativeCurrency: { name: 'Flare', symbol: 'FLR', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://flare-api.flare.network/ext/bc/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Flare Explorer', url: 'https://flare-explorer.flare.network' },
  },
} as const satisfies Chain;

// Define Coston2 Testnet
export const coston2 = {
  id: 114,
  name: 'Coston2',
  nativeCurrency: { name: 'Coston2 Flare', symbol: 'C2FLR', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://coston2-api.flare.network/ext/bc/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Coston2 Explorer', url: 'https://coston2-explorer.flare.network' },
  },
  testnet: true,
} as const satisfies Chain;

// RainbowKit config - no WalletConnect projectId needed for injected wallets
export const config = getDefaultConfig({
  appName: 'Flare Custom Feeds',
  projectId: 'flare-custom-feeds', // Placeholder - WalletConnect optional
  chains: [flare, coston2],
  transports: {
    [flare.id]: http(),
    [coston2.id]: http(),
  },
  ssr: true,
});

// Export for use in components
export const supportedChains = [flare, coston2] as const;
export type SupportedChainId = typeof flare.id | typeof coston2.id;

export function getChainById(chainId: number): Chain | undefined {
  return supportedChains.find(chain => chain.id === chainId);
}

export function getExplorerUrl(chainId: number, type: 'address' | 'tx', hash: string): string {
  const chain = getChainById(chainId);
  if (!chain?.blockExplorers?.default) return '#';
  const base = chain.blockExplorers.default.url;
  return type === 'address' ? `${base}/address/${hash}` : `${base}/tx/${hash}`;
}

