# UI Architecture: Flare Custom Feeds Toolkit Frontend

> AI-optimized reference for frontend architecture and implementation patterns.
> For codebase overview, see `CODEBASE_CONTEXT.md`. For user docs, see `README.md`.
>
> **Brand**: Flare Forward (Primary: #E8195D | Fonts: Satoshi, Archivo Black)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Decisions](#architecture-decisions)
3. [Security Requirements](#security-requirements)
4. [File Structure](#file-structure)
5. [Core Components](#core-components)
6. [Data Flow & State Management](#data-flow--state-management)
7. [Smart Contract Integration](#smart-contract-integration)
8. [UI/UX Specifications](#uiux-specifications)
9. [Brand Kit Integration Guide](#brand-kit-integration-guide)
10. [Implementation Phases](#implementation-phases)
11. [Testing Strategy](#testing-strategy)
12. [Reference Code Snippets](#reference-code-snippets)

---

## Executive Summary

### What We're Building

A self-hosted frontend for the Flare Custom Feeds Toolkit that enables users to:
- Deploy their own `PriceRecorder` contracts
- Create custom price feeds from Uniswap V3 pools
- Monitor feed health and update history
- Manage the full lifecycle (deploy → monitor → pause/deprecate)

### Deployment Model

**Self-hosted**: Users fork/clone the repo and run locally. No external hosting, no databases, no API keys required for basic functionality.

### Target Users

1. **Developers/Protocols** - integrating custom price feeds into dApps
2. **Power Users** - creating feeds for tokens not covered by FTSO

Progressive disclosure accommodates both: simple defaults with advanced options.

---

## Architecture Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Framework** | Next.js 14 (App Router) | SSR capability, great DX, file-based routing |
| **Styling** | shadcn/ui + Tailwind CSS | Accessible components, easy brand customization |
| **Wallet** | RainbowKit + wagmi + viem | No API key needed for injected wallets, polished UX |
| **Data Storage** | Local JSON file | Zero infrastructure, user owns data |
| **State** | React Context + useState | Simple, no external state library needed |
| **Theme** | Light/Dark toggle | User preference with system detection fallback |

### Networks Supported

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Flare Mainnet | 14 | `https://flare-api.flare.network/ext/bc/C/rpc` |
| Coston2 Testnet | 114 | `https://coston2-api.flare.network/ext/bc/C/rpc` |

### Test Wallet

```
Address: 0x5d92A2486042Dd4cEE0BD6B5ffd98a8C3A6EA4Fe
Note: Verify this matches DEPLOYER_PRIVATE_KEY in .env during testing
```

---

## Security Requirements

### React Safety Checklist

Before any code touches user data, validate at these points:

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INPUT TOUCHPOINTS                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. Form inputs (pool address, token decimals, feed name)        │
│ 2. Wallet callbacks (address, chainId, transaction results)     │
│ 3. Fetch responses (RPC calls, contract reads)                  │
│ 4. URL parameters (if any deep linking)                         │
│ 5. LocalStorage reads (feeds.json data)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Defense Layers

```
Layer 1: Client-Side
├── Input sanitization (addresses, numbers only where expected)
├── Address validation (checksum, length)
├── Type coercion prevention (explicit parsing)
└── XSS prevention (no dangerouslySetInnerHTML with user data)

Layer 2: Wallet Actions
├── Authenticated actions only (require connected wallet)
├── Chain ID verification before transactions
├── Transaction simulation where possible
└── Clear user confirmation for all on-chain actions

Layer 3: API/Input Validation
├── Zod schemas for all form data
├── Rate limiting on API routes (if needed)
├── Validate contract responses match expected ABI
└── Sanitize before writing to feeds.json

Layer 4: Contract Guardrails
├── Owner-only admin functions (already in contracts)
├── Update interval enforcement
├── Pool whitelist (enabledPools mapping)
└── FDC proof verification

Layer 5: Monitoring
├── Console logging for debugging
├── Error boundaries with user-friendly messages
├── Transaction status tracking
└── Balance warnings (< 1 FLR warning, < 0.1 FLR critical)
```

### Validation Helpers

```typescript
// frontend/src/lib/validation.ts

import { z } from 'zod';
import { getAddress, isAddress } from 'viem';

// Ethereum address schema with checksum validation
export const addressSchema = z.string().refine(
  (val) => isAddress(val),
  { message: 'Invalid Ethereum address' }
).transform((val) => getAddress(val)); // Normalize to checksum

// Pool configuration schema
export const poolConfigSchema = z.object({
  poolAddress: addressSchema,
  feedAlias: z.string()
    .min(1, 'Alias required')
    .max(20, 'Max 20 characters')
    .regex(/^[A-Z0-9_]+$/, 'Uppercase letters, numbers, underscores only'),
  token0Decimals: z.number().int().min(0).max(18),
  token1Decimals: z.number().int().min(0).max(18),
  invertPrice: z.boolean().default(false),
});

// Network schema
export const networkSchema = z.enum(['flare', 'coston2']);

// Feed data from storage
export const storedFeedSchema = z.object({
  id: z.string().uuid(),
  alias: z.string(),
  poolAddress: addressSchema,
  customFeedAddress: addressSchema,
  priceRecorderAddress: addressSchema,
  network: networkSchema,
  token0Decimals: z.number(),
  token1Decimals: z.number(),
  invertPrice: z.boolean(),
  deployedAt: z.string().datetime(),
  deployedBy: addressSchema,
});
```

---

## File Structure

```
flare-custom-feeds-toolkit/
├── contracts/                    # Existing Solidity contracts
├── scripts/                      # Existing deployment scripts
├── src/                          # Existing bot code
├── frontend/                     # NEW: Next.js frontend
│   ├── data/
│   │   └── feeds.json            # User's deployed feeds (persisted)
│   ├── public/
│   │   └── brand/                # Flare Forward brand assets
│   │       ├── brand-config.json # Color/font config (machine-readable)
│   │       ├── logo.png          # Main logo (pink arrow + text)
│   │       └── fonts/
│   │           ├── Satoshi-Variable.woff2
│   │           ├── Satoshi-Variable.woff
│   │           └── ArchivoBlack-Regular.ttf
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout (providers, theme)
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx    # Dashboard layout (sidebar)
│   │   │   │   ├── page.tsx      # Dashboard home (overview)
│   │   │   │   ├── deploy/
│   │   │   │   │   └── page.tsx  # Deploy section
│   │   │   │   ├── monitor/
│   │   │   │   │   └── page.tsx  # Monitor feeds
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx  # Settings + Export Bot Config
│   │   │   ├── api/
│   │   │   │   └── feeds/
│   │   │   │       └── route.ts  # CRUD for feeds.json
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/               # shadcn components
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── ThemeToggle.tsx
│   │   │   ├── wallet/
│   │   │   │   ├── ConnectButton.tsx
│   │   │   │   └── NetworkSwitcher.tsx
│   │   │   ├── deploy/
│   │   │   │   ├── DeployModal.tsx
│   │   │   │   ├── RecorderDeployForm.tsx
│   │   │   │   ├── FeedDeployForm.tsx
│   │   │   │   └── PoolConfigForm.tsx
│   │   │   ├── monitor/
│   │   │   │   ├── FeedCard.tsx
│   │   │   │   ├── FeedDetails.tsx
│   │   │   │   ├── PriceChart.tsx
│   │   │   │   └── BotStatusIndicator.tsx  # Bot health status
│   │   │   ├── settings/
│   │   │   │   └── ExportBotConfig.tsx     # Generate .env for bot
│   │   │   └── common/
│   │   │       ├── AddressDisplay.tsx
│   │   │       ├── TransactionStatus.tsx
│   │   │       ├── BalanceWarning.tsx
│   │   │       └── GasEstimate.tsx         # Dynamic gas estimation
│   │   ├── lib/
│   │   │   ├── validation.ts     # Zod schemas
│   │   │   ├── contracts.ts      # Contract ABIs & addresses
│   │   │   ├── constants.ts      # Network configs, addresses
│   │   │   ├── price-utils.ts    # sqrtPriceX96 conversion
│   │   │   ├── wagmi-config.ts   # Wallet configuration
│   │   │   ├── bot-status.ts     # Bot status detection logic
│   │   │   └── bot-config.ts     # .env config generation
│   │   ├── hooks/
│   │   │   ├── useFeeds.ts       # CRUD operations for feeds
│   │   │   ├── useContractDeploy.ts
│   │   │   ├── usePriceRecorder.ts
│   │   │   ├── useCustomFeed.ts
│   │   │   └── useGasEstimate.ts # Real-time gas estimation
│   │   ├── context/
│   │   │   ├── FeedsContext.tsx
│   │   │   └── DeployContext.tsx
│   │   └── types/
│   │       └── index.ts
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── package.json
│   └── tsconfig.json
└── UIPLAN.md                     # This file
```

---

## Core Components

### 1. Landing Page (`app/page.tsx`)

**Purpose**: Inform users what this tool does, guide them to connect wallet.

```tsx
// Structure
<Landing>
  <Hero>
    <Logo />
    <Headline: "Create Custom Price Feeds on Flare" />
    <Subheadline: "FDC-verified feeds from any Uniswap V3 pool" />
    <ConnectWalletCTA />
  </Hero>
  
  <HowItWorks>
    <Step 1: "Deploy a Price Recorder" />
    <Step 2: "Enable your target pool" />
    <Step 3: "Deploy a Custom Feed" />
    <Step 4: "Run the bot to keep it updated" />
  </HowItWorks>
  
  <CostBreakdown>
    {/* Uses useFullUpdateEstimate() for real-time gas prices */}
    <Item: "~{recordPriceCost} FLR per price recording (gas)" />
    <Item: "~1.0 FLR per FDC attestation (fixed fee)" />
    <Item: "~{updateFromProofCost} FLR per proof submission (gas)" />
    <Item: "Total: ~{totalCost} FLR per update" />
    <Note: "Gas costs vary with network conditions" />
  </CostBreakdown>
</Landing>
```

### 2. Dashboard Layout (`app/dashboard/layout.tsx`)

**Purpose**: Authenticated area with sidebar navigation.

```tsx
// Structure
<DashboardLayout>
  <Sidebar>
    <Logo />
    <NetworkSwitcher />  {/* Mainnet / Coston2 */}
    <Nav>
      <NavItem icon={Home} href="/dashboard">Overview</NavItem>
      <NavItem icon={Rocket} href="/dashboard/deploy">Deploy</NavItem>
      <NavItem icon={Activity} href="/dashboard/monitor">Monitor</NavItem>
      <NavItem icon={Settings} href="/dashboard/settings">Settings</NavItem>
    </Nav>
    <WalletInfo />
    <BalanceDisplay />
    <GasIndicator /> {/* Current network gas price */}
  </Sidebar>
  
  <Main>
    <Header>
      <PageTitle />
      <ThemeToggle />
      <ConnectButton />
    </Header>
    <Content>{children}</Content>
  </Main>
</DashboardLayout>
```

### 3. Deploy Modal (`components/deploy/DeployModal.tsx`)

**Purpose**: Multi-step deployment flow in a modal overlay.

```tsx
// States
type DeployStep = 
  | 'select-action'      // Deploy Recorder vs Deploy Feed
  | 'configure-recorder' // Recorder settings
  | 'configure-feed'     // Pool address, decimals, alias
  | 'review'             // Show summary + gas estimate before deploy
  | 'deploying'          // Transaction in progress
  | 'success'            // Deployed! Show addresses
  | 'error';             // Something went wrong

// Modal stays open throughout, step changes content
<DeployModal open={open} onClose={handleClose}>
  {step === 'select-action' && <SelectActionStep />}
  {step === 'configure-recorder' && <RecorderConfigStep />}
  {step === 'configure-feed' && <FeedConfigStep />}
  {step === 'review' && (
    <ReviewStep>
      <ConfigSummary config={config} />
      <GasEstimate operation={deployType} /> {/* Dynamic gas cost */}
      <DeployButton disabled={isHighGas && !userOverride} />
    </ReviewStep>
  )}
  {step === 'deploying' && <DeployingStep txHash={hash} />}
  {step === 'success' && <SuccessStep addresses={deployed} />}
  {step === 'error' && <ErrorStep error={error} onRetry={retry} />}
</DeployModal>
```

### 4. Feed Card (`components/monitor/FeedCard.tsx`)

**Purpose**: Display a deployed feed's status at a glance, including bot health.

```tsx
<FeedCard feed={feed}>
  <Header>
    <FeedAlias>{feed.alias}</FeedAlias>
    <BotStatusIndicator 
      lastUpdateTimestamp={feed.lastUpdateTimestamp}
      updateInterval={feed.updateInterval}
    /> {/* Active (green), Stale (yellow), Inactive (red) */}
  </Header>
  
  <PriceDisplay>
    <CurrentPrice>{formatPrice(feed.latestValue)}</CurrentPrice>
    <LastUpdated>{timeAgo(feed.lastUpdateTimestamp)}</LastUpdated>
  </PriceDisplay>
  
  <Details>
    <Row label="Pool" value={<AddressDisplay address={feed.poolAddress} />} />
    <Row label="Feed" value={<AddressDisplay address={feed.customFeedAddress} />} />
    <Row label="Updates" value={feed.updateCount} />
  </Details>
  
  <Actions>
    <Button variant="ghost" onClick={viewDetails}>Details</Button>
    <Button variant="ghost" onClick={copyFeedId}>Copy Feed ID</Button>
  </Actions>
</FeedCard>
```

### 5. Progressive Disclosure Pattern

```tsx
// Used in forms throughout the app
<FormSection>
  {/* Always visible - simple inputs */}
  <SimpleInputs>
    <Input label="Pool Address" {...poolAddress} />
    <Input label="Feed Alias" {...feedAlias} />
  </SimpleInputs>
  
  {/* Hidden by default */}
  <Collapsible>
    <CollapsibleTrigger>
      <Button variant="ghost">
        Advanced Options <ChevronDown />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <Input label="Token 0 Decimals" {...token0Decimals} />
      <Input label="Token 1 Decimals" {...token1Decimals} />
      <Switch label="Invert Price" {...invertPrice} />
      <Input label="Update Interval (seconds)" {...updateInterval} />
    </CollapsibleContent>
  </Collapsible>
</FormSection>
```

### 6. Bot Status Indicator (`components/monitor/BotStatusIndicator.tsx`)

**Purpose**: Shows whether feeds are being updated by detecting recent on-chain activity.

```tsx
// Determines bot status by checking lastUpdateTimestamp against updateInterval
type BotStatus = 'active' | 'stale' | 'inactive' | 'unknown';

<BotStatusIndicator feed={feed}>
  <StatusDot status={botStatus} />
  <StatusLabel>
    {botStatus === 'active' && 'Bot Active'}
    {botStatus === 'stale' && 'Updates Delayed'}
    {botStatus === 'inactive' && 'Bot Inactive'}
    {botStatus === 'unknown' && 'Checking...'}
  </StatusLabel>
  <Tooltip>
    <LastUpdate>Last update: {timeAgo(lastUpdateTimestamp)}</LastUpdate>
    <ExpectedInterval>Expected every: {updateInterval}s</ExpectedInterval>
    <NextExpected>Next expected: {timeUntilStale}</NextExpected>
  </Tooltip>
</BotStatusIndicator>
```

**Status Logic**:
```typescript
// frontend/src/lib/bot-status.ts

export type BotStatus = 'active' | 'stale' | 'inactive' | 'unknown';

/**
 * Determine bot status based on last update time
 * @param lastUpdateTimestamp - Unix timestamp of last feed update
 * @param updateInterval - Expected update interval in seconds (from PriceRecorder)
 * @param now - Current timestamp (default: Date.now())
 */
export function getBotStatus(
  lastUpdateTimestamp: number,
  updateInterval: number,
  now: number = Date.now()
): BotStatus {
  if (!lastUpdateTimestamp) return 'unknown';
  
  const lastUpdateMs = lastUpdateTimestamp * 1000;
  const timeSinceUpdate = now - lastUpdateMs;
  const intervalMs = updateInterval * 1000;
  
  // Active: within 1.5x the expected interval
  if (timeSinceUpdate < intervalMs * 1.5) {
    return 'active';
  }
  
  // Stale: between 1.5x and 5x the expected interval
  if (timeSinceUpdate < intervalMs * 5) {
    return 'stale';
  }
  
  // Inactive: more than 5x the expected interval
  return 'inactive';
}

/**
 * Get human-readable status message
 */
export function getStatusMessage(status: BotStatus): string {
  switch (status) {
    case 'active':
      return 'Bot is running and updates are on schedule';
    case 'stale':
      return 'Updates are delayed - check if bot is running';
    case 'inactive':
      return 'No recent updates - bot may be stopped';
    case 'unknown':
      return 'Unable to determine bot status';
  }
}
```

### 7. Export Bot Config (`components/settings/ExportBotConfig.tsx`)

**Purpose**: Generate `.env` variables for the bot based on deployed feeds.

```tsx
<ExportBotConfig>
  <Header>
    <Title>Bot Configuration</Title>
    <Description>
      Generate environment variables for running the price update bot.
    </Description>
  </Header>
  
  <NetworkSelector>
    <Select value={network} onValueChange={setNetwork}>
      <SelectItem value="flare">Flare Mainnet</SelectItem>
      <SelectItem value="coston2">Coston2 Testnet</SelectItem>
    </Select>
  </NetworkSelector>
  
  <FeedSelector>
    {/* Multi-select feeds to include in config */}
    {feeds.filter(f => f.network === network).map(feed => (
      <Checkbox 
        key={feed.id}
        checked={selectedFeeds.includes(feed.id)}
        onCheckedChange={() => toggleFeed(feed.id)}
        label={feed.alias}
      />
    ))}
  </FeedSelector>
  
  <Preview>
    <CodeBlock language="bash">
      {generatedEnvConfig}
    </CodeBlock>
  </Preview>
  
  <Actions>
    <Button onClick={copyToClipboard}>
      <Copy /> Copy to Clipboard
    </Button>
    <Button variant="outline" onClick={downloadEnvFile}>
      <Download /> Download .env
    </Button>
  </Actions>
</ExportBotConfig>
```

**Config Generation Logic**:
```typescript
// frontend/src/lib/bot-config.ts

import { StoredFeed, StoredRecorder } from '@/types';

interface BotConfigOptions {
  feeds: StoredFeed[];
  recorder: StoredRecorder | null;
  network: 'flare' | 'coston2';
  privateKeyPlaceholder?: boolean;
}

/**
 * Generate .env file content for the bot
 */
export function generateBotEnvConfig(options: BotConfigOptions): string {
  const { feeds, recorder, network, privateKeyPlaceholder = true } = options;
  
  const lines: string[] = [
    '# ================================================',
    '# Flare Custom Feeds Bot Configuration',
    `# Network: ${network === 'flare' ? 'Flare Mainnet' : 'Coston2 Testnet'}`,
    `# Generated: ${new Date().toISOString()}`,
    '# ================================================',
    '',
    '# Deployer wallet (KEEP SECRET - DO NOT COMMIT)',
    privateKeyPlaceholder 
      ? 'DEPLOYER_PRIVATE_KEY=0x_YOUR_PRIVATE_KEY_HERE'
      : '# DEPLOYER_PRIVATE_KEY already set',
    '',
    '# Network RPC',
    network === 'flare'
      ? 'FLARE_RPC_URL=https://flare-api.flare.network/ext/bc/C/rpc'
      : 'FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc',
    '',
  ];
  
  // Add recorder address
  if (recorder) {
    lines.push('# Price Recorder Contract');
    lines.push(`PRICE_RECORDER_ADDRESS=${recorder.address}`);
    lines.push('');
  }
  
  // Add feeds
  if (feeds.length > 0) {
    lines.push('# Custom Feeds');
    lines.push('# Format: POOL_ADDRESS_<ALIAS> and CUSTOM_FEED_ADDRESS_<ALIAS>');
    lines.push('');
    
    for (const feed of feeds) {
      lines.push(`# ${feed.alias}`);
      lines.push(`POOL_ADDRESS_${feed.alias}=${feed.poolAddress}`);
      lines.push(`CUSTOM_FEED_ADDRESS_${feed.alias}=${feed.customFeedAddress}`);
      lines.push('');
    }
  }
  
  // Add bot settings
  lines.push('# Bot Settings (optional)');
  lines.push('BOT_CHECK_INTERVAL_SECONDS=60');
  lines.push('BOT_LOG_LEVEL=compact');
  lines.push('BOT_LOG_FILE_ENABLED=true');
  
  return lines.join('\n');
}

/**
 * Download config as .env file
 */
export function downloadEnvFile(content: string, filename = 'bot.env'): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### 8. Dynamic Gas Estimation (`components/common/GasEstimate.tsx`)

**Purpose**: Show real-time gas estimates for transactions instead of fixed values.

```tsx
<GasEstimate operation={operation} config={txConfig}>
  <EstimateRow>
    <Label>Estimated Gas</Label>
    <Value>{formatGas(estimatedGas)} units</Value>
  </EstimateRow>
  
  <EstimateRow>
    <Label>Gas Price</Label>
    <Value>{formatGwei(gasPrice)} gwei</Value>
  </EstimateRow>
  
  <EstimateRow highlight>
    <Label>Estimated Cost</Label>
    <Value>{formatFLR(totalCost)} FLR</Value>
    <UsdValue>(~${usdValue})</UsdValue>
  </EstimateRow>
  
  {operation === 'full-update' && (
    <FdcFeeNote>
      <InfoIcon />
      <Text>+ ~1.0 FLR FDC attestation fee (paid separately by bot)</Text>
    </FdcFeeNote>
  )}
  
  {isHighGas && (
    <WarningBanner>
      <AlertTriangle />
      Gas prices are elevated. Consider waiting for lower fees.
    </WarningBanner>
  )}
</GasEstimate>
```

**Gas Estimation Hook**:
```typescript
// frontend/src/hooks/useGasEstimate.ts

import { useEstimateGas, useGasPrice, usePublicClient } from 'wagmi';
import { formatEther, formatGwei, parseEther } from 'viem';
import { useMemo } from 'react';

export type GasOperation = 
  | 'deploy-recorder'
  | 'deploy-feed'
  | 'enable-pool'
  | 'record-price'
  | 'update-from-proof';

interface GasEstimateResult {
  estimatedGas: bigint | undefined;
  gasPrice: bigint | undefined;
  totalCostWei: bigint | undefined;
  totalCostFLR: string;
  gasPriceGwei: string;
  isLoading: boolean;
  isHighGas: boolean;
  error: Error | null;
}

// Gas limits for fallback estimation (based on actual contract usage)
const GAS_LIMITS: Record<GasOperation, bigint> = {
  'deploy-recorder': 1_500_000n,
  'deploy-feed': 2_000_000n,
  'enable-pool': 100_000n,
  'record-price': 150_000n,
  'update-from-proof': 300_000n,
};

// High gas threshold (100 gwei)
const HIGH_GAS_THRESHOLD = 100_000_000_000n;

export function useGasEstimate(
  operation: GasOperation,
  txConfig?: {
    to?: `0x${string}`;
    data?: `0x${string}`;
    value?: bigint;
  }
): GasEstimateResult {
  const publicClient = usePublicClient();
  const { data: gasPrice, isLoading: gasPriceLoading } = useGasPrice();
  
  // Try to estimate actual gas if we have tx config
  const { data: estimatedGas, isLoading: gasLoading, error } = useEstimateGas({
    ...txConfig,
    query: {
      enabled: !!txConfig?.to || !!txConfig?.data,
    },
  });
  
  // Use estimated gas or fall back to known limits
  const gasToUse = estimatedGas ?? GAS_LIMITS[operation];
  
  const result = useMemo(() => {
    if (!gasPrice || !gasToUse) {
      return {
        estimatedGas: gasToUse,
        gasPrice: undefined,
        totalCostWei: undefined,
        totalCostFLR: '...',
        gasPriceGwei: '...',
        isLoading: gasPriceLoading || gasLoading,
        isHighGas: false,
        error: error as Error | null,
      };
    }
    
    const totalCostWei = gasToUse * gasPrice;
    
    return {
      estimatedGas: gasToUse,
      gasPrice,
      totalCostWei,
      totalCostFLR: parseFloat(formatEther(totalCostWei)).toFixed(4),
      gasPriceGwei: parseFloat(formatGwei(gasPrice)).toFixed(2),
      isLoading: false,
      isHighGas: gasPrice > HIGH_GAS_THRESHOLD,
      error: error as Error | null,
    };
  }, [gasToUse, gasPrice, gasPriceLoading, gasLoading, error]);
  
  return result;
}

/**
 * Get total estimated cost for a full feed update cycle
 * (recordPrice + FDC fee + updateFromProof)
 */
export function useFullUpdateEstimate(): {
  recordPriceCost: string;
  fdcFee: string;
  updateFromProofCost: string;
  totalCost: string;
  isLoading: boolean;
} {
  const recordEstimate = useGasEstimate('record-price');
  const updateEstimate = useGasEstimate('update-from-proof');
  
  const FDC_FEE_FLR = '1.0'; // Fixed FDC attestation fee
  
  if (recordEstimate.isLoading || updateEstimate.isLoading) {
    return {
      recordPriceCost: '...',
      fdcFee: FDC_FEE_FLR,
      updateFromProofCost: '...',
      totalCost: '...',
      isLoading: true,
    };
  }
  
  const recordCost = parseFloat(recordEstimate.totalCostFLR) || 0.002;
  const updateCost = parseFloat(updateEstimate.totalCostFLR) || 0.004;
  const fdcFee = parseFloat(FDC_FEE_FLR);
  const total = recordCost + fdcFee + updateCost;
  
  return {
    recordPriceCost: recordCost.toFixed(4),
    fdcFee: FDC_FEE_FLR,
    updateFromProofCost: updateCost.toFixed(4),
    totalCost: total.toFixed(4),
    isLoading: false,
  };
}

---

## Data Flow & State Management

### Feeds Storage (`data/feeds.json`)

```json
{
  "version": "1.0.0",
  "feeds": [
    {
      "id": "uuid-v4-here",
      "alias": "FXRP_USDTO",
      "network": "flare",
      "poolAddress": "0x...",
      "customFeedAddress": "0x...",
      "priceRecorderAddress": "0x...",
      "token0Decimals": 18,
      "token1Decimals": 6,
      "invertPrice": false,
      "deployedAt": "2025-12-09T12:00:00.000Z",
      "deployedBy": "0x..."
    }
  ],
  "recorders": [
    {
      "id": "uuid-v4-here",
      "address": "0x...",
      "network": "flare",
      "updateInterval": 300,
      "deployedAt": "2025-12-09T11:00:00.000Z",
      "deployedBy": "0x..."
    }
  ]
}
```

### API Route (`app/api/feeds/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { storedFeedSchema } from '@/lib/validation';

const DATA_PATH = join(process.cwd(), 'data', 'feeds.json');

// GET - Read all feeds
export async function GET() {
  try {
    const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    return NextResponse.json(data);
  } catch (error) {
    // Return empty state if file doesn't exist
    return NextResponse.json({ version: '1.0.0', feeds: [], recorders: [] });
  }
}

// POST - Add new feed or recorder
export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // Validate with Zod
  const validation = storedFeedSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error },
      { status: 400 }
    );
  }
  
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  data.feeds.push(validation.data);
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  
  return NextResponse.json({ success: true, feed: validation.data });
}

// DELETE - Remove feed by ID
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  data.feeds = data.feeds.filter((f: any) => f.id !== id);
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  
  return NextResponse.json({ success: true });
}
```

### Feeds Context (`context/FeedsContext.tsx`)

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StoredFeed, StoredRecorder } from '@/types';

interface FeedsContextType {
  feeds: StoredFeed[];
  recorders: StoredRecorder[];
  isLoading: boolean;
  error: Error | null;
  addFeed: (feed: StoredFeed) => Promise<void>;
  removeFeed: (id: string) => Promise<void>;
  addRecorder: (recorder: StoredRecorder) => Promise<void>;
  refresh: () => Promise<void>;
}

const FeedsContext = createContext<FeedsContextType | null>(null);

export function FeedsProvider({ children }: { children: ReactNode }) {
  const [feeds, setFeeds] = useState<StoredFeed[]>([]);
  const [recorders, setRecorders] = useState<StoredRecorder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/feeds');
      const data = await res.json();
      setFeeds(data.feeds || []);
      setRecorders(data.recorders || []);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const addFeed = async (feed: StoredFeed) => {
    await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feed),
    });
    await refresh();
  };

  const removeFeed = async (id: string) => {
    await fetch(`/api/feeds?id=${id}`, { method: 'DELETE' });
    await refresh();
  };

  const addRecorder = async (recorder: StoredRecorder) => {
    await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'recorder', ...recorder }),
    });
    await refresh();
  };

  return (
    <FeedsContext.Provider value={{
      feeds, recorders, isLoading, error,
      addFeed, removeFeed, addRecorder, refresh
    }}>
      {children}
    </FeedsContext.Provider>
  );
}

export const useFeeds = () => {
  const ctx = useContext(FeedsContext);
  if (!ctx) throw new Error('useFeeds must be used within FeedsProvider');
  return ctx;
};
```

---

## Smart Contract Integration

### Contract ABIs

Import from existing `artifacts/` directory or inline the required functions:

```typescript
// frontend/src/lib/contracts.ts

// PriceRecorder ABI (minimal required functions)
export const PRICE_RECORDER_ABI = [
  'function recordPrice(address pool) external',
  'function recordPriceBatch(address[] calldata pools) external',
  'function enablePool(address pool) external',
  'function disablePool(address pool) external',
  'function canUpdate(address pool) external view returns (bool)',
  'function enabledPools(address pool) external view returns (bool)',
  'function poolInfo(address pool) external view returns (address token0, address token1, uint256 lastRecordedTime)',
  'function updateInterval() external view returns (uint256)',
  'function owner() external view returns (address)',
  'event PriceRecorded(address indexed pool, uint160 sqrtPriceX96, int24 tick, uint128 liquidity, address token0, address token1, uint256 timestamp, uint256 blockNumber)',
] as const;

// PoolPriceCustomFeed ABI (minimal required functions)
export const CUSTOM_FEED_ABI = [
  'function feedId() external view returns (bytes21)',
  'function read() external view returns (uint256)',
  'function decimals() external pure returns (int8)',
  'function calculateFee() external pure returns (uint256)',
  'function getCurrentFeed() external payable returns (uint256, int8, uint64)',
  'function latestValue() external view returns (uint256)',
  'function lastUpdateTimestamp() external view returns (uint64)',
  'function updateCount() external view returns (uint256)',
  'function poolAddress() external view returns (address)',
  'function priceRecorderAddress() external view returns (address)',
  'function token0Decimals() external view returns (uint8)',
  'function token1Decimals() external view returns (uint8)',
  'function invertPrice() external view returns (bool)',
] as const;

// Uniswap V3 Pool ABI (for auto-detection)
export const UNISWAP_V3_POOL_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
] as const;

// ERC20 ABI (for token info)
export const ERC20_ABI = [
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
] as const;
```

### Contract Deployment Hook

```typescript
// frontend/src/hooks/useContractDeploy.ts

import { useWalletClient, usePublicClient } from 'wagmi';
import { useState } from 'react';

interface DeployResult {
  address: `0x${string}`;
  txHash: `0x${string}`;
}

export function useContractDeploy() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deployPriceRecorder = async (updateInterval: number): Promise<DeployResult> => {
    if (!walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    setIsDeploying(true);
    setError(null);

    try {
      // Import bytecode from artifacts
      const { abi, bytecode } = await import('@/../contracts/artifacts/PriceRecorder.json');

      const hash = await walletClient.deployContract({
        abi,
        bytecode: bytecode as `0x${string}`,
        args: [BigInt(updateInterval)],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (!receipt.contractAddress) {
        throw new Error('Contract deployment failed');
      }

      return {
        address: receipt.contractAddress,
        txHash: hash,
      };
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setIsDeploying(false);
    }
  };

  const deployCustomFeed = async (config: {
    priceRecorderAddress: `0x${string}`;
    poolAddress: `0x${string}`;
    feedAlias: string;
    token0Decimals: number;
    token1Decimals: number;
    invertPrice: boolean;
  }): Promise<DeployResult> => {
    if (!walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    setIsDeploying(true);
    setError(null);

    try {
      const { abi, bytecode } = await import('@/../contracts/artifacts/PoolPriceCustomFeed.json');

      const hash = await walletClient.deployContract({
        abi,
        bytecode: bytecode as `0x${string}`,
        args: [
          config.priceRecorderAddress,
          config.poolAddress,
          config.feedAlias,
          config.token0Decimals,
          config.token1Decimals,
          config.invertPrice,
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (!receipt.contractAddress) {
        throw new Error('Contract deployment failed');
      }

      return {
        address: receipt.contractAddress,
        txHash: hash,
      };
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setIsDeploying(false);
    }
  };

  return {
    deployPriceRecorder,
    deployCustomFeed,
    isDeploying,
    error,
  };
}
```

### Price Utilities

```typescript
// frontend/src/lib/price-utils.ts

const Q96 = 2n ** 96n;

/**
 * Convert sqrtPriceX96 to human-readable price
 * Matches the contract's calculation exactly
 */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number,
  invertPrice: boolean
): number {
  // price = (sqrtPriceX96 / 2^96)^2 * 10^18
  let price = (sqrtPriceX96 * sqrtPriceX96 * (10n ** 18n)) / (Q96 * Q96);

  // Adjust for token decimals
  const adj = token0Decimals - token1Decimals;
  if (adj > 0) {
    price = price * (10n ** BigInt(adj));
  } else if (adj < 0) {
    price = price / (10n ** BigInt(-adj));
  }

  // Scale to 6 decimals (contract stores with 6 decimals)
  price = price / (10n ** 12n);

  // Invert if needed
  if (invertPrice) {
    price = (10n ** 12n) / price;
  }

  // Convert to number (6 decimal places)
  return Number(price) / 1e6;
}

/**
 * Format price for display
 */
export function formatPrice(value: bigint | number, decimals = 6): string {
  const num = typeof value === 'bigint' ? Number(value) / 10 ** decimals : value;
  
  if (num >= 1000) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } else if (num >= 1) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 4 });
  } else {
    return num.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
}

/**
 * Calculate estimated update cost
 */
export function estimateUpdateCost(): {
  recordPrice: number;
  attestation: number;
  updateFromProof: number;
  total: number;
} {
  return {
    recordPrice: 0.002,    // ~gas cost in FLR
    attestation: 1.0,       // FDC fee
    updateFromProof: 0.004, // ~gas cost in FLR
    total: 1.006,
  };
}
```

---

## UI/UX Specifications

### Theme System (Flare Forward Brand Applied)

```typescript
// frontend/tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Flare Forward Brand Colors
        brand: {
          50: '#FFF0F5',   // Lightest pink tint
          100: '#FFE0EB',
          200: '#FFC2D6',
          300: '#FF94B8',
          400: '#FF5C8F',
          500: '#E8195D',  // PRIMARY - Flare Pink
          600: '#D01652',
          700: '#B01245',
          800: '#8F0E38',
          900: '#6D0A2B',
          950: '#4A071D',
        },
        accent: {
          DEFAULT: '#E8195D',  // Same as primary for Flare Forward
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        // Flare Forward Brand Fonts
        sans: ['Satoshi', 'var(--font-satoshi)', 'system-ui', 'sans-serif'],
        display: ['Archivo Black', 'var(--font-archivo)', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### CSS Variables (Flare Forward Theme)

```css
/* frontend/src/app/globals.css */

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import brand fonts */
@font-face {
  font-family: 'Satoshi';
  src: url('/brand/fonts/Satoshi-Variable.woff2') format('woff2'),
       url('/brand/fonts/Satoshi-Variable.woff') format('woff');
  font-weight: 300 900;
  font-display: swap;
  font-style: normal;
}

@font-face {
  font-family: 'Archivo Black';
  src: url('/brand/fonts/ArchivoBlack-Regular.ttf') format('truetype');
  font-weight: 900;
  font-display: swap;
  font-style: normal;
}

@layer base {
  :root {
    /* Flare Forward Brand - Light Theme */
    --brand-50: #FFF0F5;
    --brand-100: #FFE0EB;
    --brand-200: #FFC2D6;
    --brand-300: #FF94B8;
    --brand-400: #FF5C8F;
    --brand-500: #E8195D;  /* PRIMARY - Flare Pink */
    --brand-600: #D01652;
    --brand-700: #B01245;
    --brand-800: #8F0E38;
    --brand-900: #6D0A2B;
    --brand-950: #4A071D;
    
    --accent: #E8195D;
    --accent-foreground: #FFFFFF;
    
    /* shadcn/ui variables - Light */
    --background: 0 0% 100%;
    --foreground: 0 0% 0%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 0%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 0%;
    --primary: 340 85% 50%;  /* Flare Pink in HSL */
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 96%;
    --secondary-foreground: 0 0% 0%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 45%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 90%;
    --input: 0 0% 90%;
    --ring: 340 85% 50%;
    --radius: 0.5rem;
  }

  .dark {
    /* Flare Forward Brand - Dark Theme (matches logo aesthetic) */
    --background: 0 0% 0%;  /* Pure black like the logo */
    --foreground: 0 0% 100%;
    --card: 0 0% 5%;
    --card-foreground: 0 0% 100%;
    --popover: 0 0% 5%;
    --popover-foreground: 0 0% 100%;
    --primary: 340 85% 50%;  /* Flare Pink */
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 15%;
    --secondary-foreground: 0 0% 100%;
    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 65%;
    --destructive: 0 62% 50%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 20%;
    --input: 0 0% 20%;
    --ring: 340 85% 50%;
  }

  /* Default to dark theme to match Flare Forward aesthetic */
  html {
    @apply bg-background text-foreground;
  }
}
```

### Toast & Modal Patterns

```typescript
// Toast notifications (using sonner via shadcn)
import { toast } from 'sonner';

// Success toast
toast.success('Feed deployed successfully!', {
  description: 'Your custom feed is now live.',
  action: {
    label: 'View',
    onClick: () => router.push('/dashboard/monitor'),
  },
});

// Transaction pending toast
toast.loading('Deploying contract...', {
  id: 'deploy-tx',
  description: 'Please confirm in your wallet',
});

// Update toast on confirmation
toast.success('Contract deployed!', {
  id: 'deploy-tx',
  description: `Address: ${shortenAddress(address)}`,
});

// Error toast
toast.error('Transaction failed', {
  description: error.message,
  action: {
    label: 'Retry',
    onClick: () => retry(),
  },
});
```

```tsx
// Modal for important confirmations (using shadcn Dialog)
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Remove Feed</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remove this feed?</AlertDialogTitle>
      <AlertDialogDescription>
        This will remove the feed from your local tracking. 
        The on-chain contract will remain deployed.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleRemove}>
        Remove
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Brand Kit (Applied) ✓

The Flare Forward brand kit has been integrated. Assets are in `frontend/public/brand/`.

### Brand Assets Location

```
frontend/public/brand/
├── brand-config.json           # Color/font reference (machine-readable)
├── logo.png                    # Main logo (pink arrow + "flare Forward")
└── fonts/
    ├── Satoshi-Variable.woff2  # Body font (300-900 weights)
    ├── Satoshi-Variable.woff   # Fallback
    └── ArchivoBlack-Regular.ttf # Display/headline font
```

### Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Flare Pink** | `#E8195D` | Primary, CTAs, accents, links |
| **Black** | `#000000` | Dark mode background |
| **White** | `#FFFFFF` | Light mode background, text on dark |
| **Success** | `#22C55E` | Confirmations, active status |
| **Warning** | `#F59E0B` | Stale status, caution |
| **Error** | `#EF4444` | Errors, inactive status |

### Typography

| Type | Font | Weight | Usage |
|------|------|--------|-------|
| **Display** | Archivo Black | 900 | Headlines, hero text, brand moments |
| **Body** | Satoshi | 400 | Body text, UI elements |
| **Body Bold** | Satoshi | 700 | Emphasis, buttons, labels |
| **Body Light** | Satoshi | 300 | Secondary text, captions |

### Logo Usage

The logo works best on dark backgrounds (matches the source aesthetic). For light mode:
- Use the logo as-is (the pink arrow provides enough contrast)
- Or apply a subtle dark background/card behind it

### Font Loading in Layout

```tsx
// frontend/src/app/layout.tsx

import localFont from 'next/font/local';

const satoshi = localFont({
  src: [
    {
      path: '../../public/brand/fonts/Satoshi-Variable.woff2',
      style: 'normal',
    },
  ],
  variable: '--font-satoshi',
  display: 'swap',
});

const archivoBlack = localFont({
  src: '../../public/brand/fonts/ArchivoBlack-Regular.ttf',
  variable: '--font-archivo',
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${satoshi.variable} ${archivoBlack.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

---

## Implementation Status

### Completed Features

**Foundation**
- Next.js 14 (App Router) with TypeScript
- Tailwind CSS + shadcn/ui components
- RainbowKit + wagmi wallet connection (injected wallets only, no WalletConnect)
- Theme toggle (light/dark)
- Local JSON storage (`data/feeds.json`)
- FeedsContext for state management

**Landing & Auth**
- Landing page with hero, how-it-works, cost breakdown
- Wallet connection flow
- Network switcher (Mainnet/Coston2)
- Balance display with low-balance warnings

**Deploy Flow**
- Deploy PriceRecorder from UI
- Deploy PoolPriceCustomFeed from UI
- Pool auto-detection (token0, token1, decimals, current price)
- Contract artifacts bundled (no hardhat compile needed)
- Transaction status tracking
- Automatic feed storage to `feeds.json`

**Monitor Dashboard**
- Feed card grid with network filtering
- "Update Feed" button with full FDC attestation workflow
- Real-time progress modal during attestation
- Integration code snippets (Solidity/JS/TS) shown after successful update

**FDC Integration**
- API routes to proxy FDC calls (CORS bypass)
- Full attestation workflow: record → attest → wait → proof → update
- Automatic pool enabling if not already enabled

### Remaining Work

**Polish**
- Export Bot Config (generate .env for standalone bot)
- Dynamic gas estimation component
- Error boundaries
- Mobile responsiveness
- Favicon

**Testing**
- Full E2E testing on Coston2
- Full E2E testing on Mainnet
- Cross-browser testing

---

## Testing Checklist

### Wallet Connection
- Connect MetaMask and other injected wallets (Rabby, Coinbase)
- Switch networks (Mainnet ↔ Coston2)
- Handle wrong network gracefully
- Low balance warnings display correctly

### Deploy Flow
- Deploy PriceRecorder on both networks
- Pool auto-detection works (shows token symbols, decimals, price)
- Deploy CustomFeed with detected pool info
- Verify `feeds.json` updates correctly
- Success screen shows "Monitor Feed" button

### Monitor & Update
- Feed cards display correctly with no overflow
- "Update Feed" triggers FDC workflow
- Progress modal shows all steps
- Integration snippets display after success
- Can copy Solidity and JS code

### Edge Cases
- Invalid pool address shows validation error
- Pool not enabled prompts enable transaction
- Insufficient balance shows warning
- Transaction rejection handled gracefully
- Network RPC errors show user-friendly message

### Test Wallet

```
Address: 0x5d92A2486042Dd4cEE0BD6B5ffd98a8C3A6EA4Fe
Networks: Flare Mainnet (14), Coston2 (114)
```

---

## Reference Code Snippets

### Wagmi Configuration

```typescript
// frontend/src/lib/wagmi-config.ts

import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// Define Flare chains
const flare = {
  id: 14,
  name: 'Flare',
  nativeCurrency: { name: 'Flare', symbol: 'FLR', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://flare-api.flare.network/ext/bc/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Flare Explorer', url: 'https://flare-explorer.flare.network' },
  },
} as const;

const coston2 = {
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
} as const;

export const config = getDefaultConfig({
  appName: 'Flare Custom Feeds',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Optional - only for WalletConnect
  chains: [flare, coston2],
  transports: {
    [flare.id]: http(),
    [coston2.id]: http(),
  },
  ssr: true,
});

// Export chains for use elsewhere
export { flare, coston2 };
```

### Address Display Component

```tsx
// frontend/src/components/common/AddressDisplay.tsx

'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChainId } from 'wagmi';
import { flare, coston2 } from '@/lib/wagmi-config';

interface AddressDisplayProps {
  address: string;
  truncate?: boolean;
  showCopy?: boolean;
  showExplorer?: boolean;
}

export function AddressDisplay({
  address,
  truncate = true,
  showCopy = true,
  showExplorer = true,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);
  const chainId = useChainId();

  const displayAddress = truncate
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

  const explorerUrl = chainId === 14
    ? `${flare.blockExplorers.default.url}/address/${address}`
    : `${coston2.blockExplorers.default.url}/address/${address}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm">
      <span title={address}>{displayAddress}</span>
      
      {showCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      )}
      
      {showExplorer && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          asChild
        >
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      )}
    </span>
  );
}
```

### Balance Warning Component

```tsx
// frontend/src/components/common/BalanceWarning.tsx

'use client';

import { useBalance, useAccount } from 'wagmi';
import { AlertTriangle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatEther } from 'viem';

const MIN_BALANCE = 1n * 10n ** 18n;      // 1 FLR warning
const CRITICAL_BALANCE = 10n ** 17n;       // 0.1 FLR critical

export function BalanceWarning() {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });

  if (!balance) return null;

  const balanceValue = balance.value;
  const formattedBalance = parseFloat(formatEther(balanceValue)).toFixed(4);

  if (balanceValue < CRITICAL_BALANCE) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Critical: Low Balance</AlertTitle>
        <AlertDescription>
          Balance: {formattedBalance} {balance.symbol}. 
          You need at least 0.1 FLR to perform transactions.
        </AlertDescription>
      </Alert>
    );
  }

  if (balanceValue < MIN_BALANCE) {
    return (
      <Alert variant="warning" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle>Low Balance Warning</AlertTitle>
        <AlertDescription>
          Balance: {formattedBalance} {balance.symbol}. 
          Consider adding more FLR for gas fees (~1 FLR per feed update).
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
```

### Pool Auto-Detection Hook

```typescript
// frontend/src/hooks/usePoolInfo.ts

'use client';

import { useReadContracts } from 'wagmi';
import { UNISWAP_V3_POOL_ABI, ERC20_ABI } from '@/lib/contracts';
import { isAddress } from 'viem';

interface PoolInfo {
  token0: `0x${string}`;
  token1: `0x${string}`;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  sqrtPriceX96: bigint;
  tick: number;
}

export function usePoolInfo(poolAddress: string | undefined) {
  const isValidAddress = poolAddress && isAddress(poolAddress);

  // First, get pool's token addresses
  const { data: poolData, isLoading: poolLoading } = useReadContracts({
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
  const slot0 = poolData?.[2]?.result as [bigint, number, ...any] | undefined;

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

  if (!isValidAddress || isLoading || !poolData || !tokenData) {
    return { data: undefined, isLoading, error: null };
  }

  const poolInfo: PoolInfo = {
    token0: token0!,
    token1: token1!,
    token0Symbol: tokenData[0]?.result as string || 'Unknown',
    token0Decimals: tokenData[1]?.result as number || 18,
    token1Symbol: tokenData[2]?.result as string || 'Unknown',
    token1Decimals: tokenData[3]?.result as number || 18,
    sqrtPriceX96: slot0?.[0] || 0n,
    tick: slot0?.[1] || 0,
  };

  return { data: poolInfo, isLoading, error: null };
}
```

---

## Notes for Future Development

### Current Capabilities

1. **Manual Feed Updates via UI** - Full FDC attestation workflow runs from the browser. Users click "Update Feed" and the UI handles: recordPrice → attestation request → wait for finalization → retrieve proof → update feed.

2. **Integration Snippets** - After successful update, users see copy-paste code for Solidity and JavaScript to integrate their feed.

3. **Bot Config Export** - Settings page can generate `.env` variables for standalone bot operation.

### Potential Enhancements

1. **Subgraph Integration**: For production at scale, consider adding a subgraph to index `PriceRecorded` events for historical data visualization and price charts.

2. **Bot Process Management**: Could add ability to start/stop bot directly from UI (would require backend service or Electron wrapper).

3. **Multi-user Hosted Version**: If Flare Forward wants to host a shared instance, would need database backend, auth, and per-user feed isolation.

4. **Gas Estimation Refinement**: Current uses fallback values; could wire up actual `estimateGas` calls for more accurate costs.

---

## Appendix: FDC Constants

```typescript
// Reference from existing codebase - do not change

// Flare Mainnet
export const FDC_HUB = '0xc25c749DC27Efb1864Cb3DADa8845B7687eB2d44';
export const RELAY = '0x57a4c3676d08Aa5d15410b5A6A80fBcEF72f3F45';
export const CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019';
export const DA_LAYER_API = 'https://flr-data-availability.flare.network';
export const VERIFIER_URL = 'https://fdc-verifiers-mainnet.flare.network/verifier/flr/EVMTransaction/prepareRequest';
```

---

*End of UI Plan*

