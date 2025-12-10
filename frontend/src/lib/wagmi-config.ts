import { http, createConfig } from 'wagmi';
import { 
  connectorsForWallets 
} from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  rabbyWallet,
  metaMaskWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
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

const chains = [flare, coston2] as const;

// Custom wallet configuration - desktop/browser wallets only
// WalletConnect removed to avoid API key requirements for this dev tool
// Users can add WalletConnect support by getting a free Project ID at https://cloud.walletconnect.com/
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Wallets',
      wallets: [
        injectedWallet,    // Detects ANY injected wallet (Rabby, Frame, etc.)
        rabbyWallet,       // Explicit Rabby support
        metaMaskWallet,    // MetaMask
        coinbaseWallet,    // Coinbase Wallet
      ],
    },
  ],
  {
    appName: 'Flare Custom Feeds',
    projectId: 'flare-custom-feeds', // Required by RainbowKit but not used without WalletConnect
  }
);

// Create wagmi config with custom connectors
export const config = createConfig({
  chains,
  connectors,
  transports: {
    [flare.id]: http(),
    [coston2.id]: http(),
  },
  ssr: true,
});

// Export for use in components
export const supportedChains = chains;
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
