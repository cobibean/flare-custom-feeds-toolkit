# Flare Custom Feeds Toolkit

> Create FDC-verified custom price feeds from Uniswap V3 pools on Flare

This toolkit enables you to deploy your own custom price feeds on Flare that are verified through the Flare Data Connector (FDC). Your feeds implement the `IICustomFeed` interface for FTSO compatibility.

## Overview

The system works in 4 steps:

1. **Price Recording** - The `PriceRecorder` contract reads price data from a Uniswap V3 pool and emits a `PriceRecorded` event on-chain
2. **FDC Attestation** - The bot requests FDC attestation for the price recording transaction
3. **Proof Retrieval** - After finalization (~90-180s), the bot retrieves the cryptographic proof from the DA Layer
4. **Feed Update** - The proof is submitted to your `PoolPriceCustomFeed` contract, which verifies it and stores the price

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   V3 Pool       │────▶│  PriceRecorder  │────▶│   FDC System    │────▶│  CustomFeed     │
│ (sqrtPriceX96)  │     │ (emit event)    │     │ (attest)        │     │ (verified price)│
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Prerequisites

- Node.js v18+
- A wallet with FLR tokens (mainnet) or C2FLR (testnet)
- A Uniswap V3 compatible pool address on Flare

## Quick Start

### 1. Clone and Install

```bash
# Clone the toolkit
git clone https://github.com/your-org/flare-custom-feeds-toolkit.git
cd flare-custom-feeds-toolkit

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` with your values:

```bash
# Your wallet private key (KEEP SECRET!)
DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere

# Network RPC (default is public endpoint)
FLARE_RPC_URL=https://flare-api.flare.network/ext/bc/C/rpc
```

### 3. Deploy PriceRecorder

```bash
npm run deploy:recorder
```

This deploys the `PriceRecorder` contract. Copy the address to your `.env`:

```bash
PRICE_RECORDER_ADDRESS=0xYourDeployedAddress
```

### 4. Enable Your Pool

```bash
POOL_ADDRESS=0xYourV3PoolAddress npm run enable:pool
```

### 5. Deploy Custom Feed

```bash
# Set your pool configuration
POOL_ADDRESS_MYFEED=0xYourV3PoolAddress

# Deploy the feed
FEED_ALIAS=MYFEED npm run deploy:feed
```

Copy the feed address to your `.env`:

```bash
CUSTOM_FEED_ADDRESS_MYFEED=0xYourFeedAddress
```

### 6. Start the Bot

```bash
npm run bot:start
```

The bot will automatically:
- Record prices every 5 minutes (configurable)
- Request FDC attestations
- Submit verified proofs to your feed

## Contracts

### PriceRecorder.sol

Records prices from Uniswap V3 pools on-chain. Emits `PriceRecorded` events that can be attested by the FDC.

**Key Functions:**
- `recordPrice(address pool)` - Record current price from a pool
- `enablePool(address pool)` - Enable a new pool (owner only)
- `canUpdate(address pool)` - Check if pool can be updated now

### PoolPriceCustomFeed.sol

FDC-verified custom feed that implements `IICustomFeed` for FTSO compatibility.

**Key Functions:**
- `updateFromProof(Proof calldata)` - Update feed with FDC proof
- `read()` - Get latest verified price
- `feedId()` - Get unique feed identifier (starts with 0x21)
- `getCurrentFeed()` - Get price, decimals, and timestamp

## Configuration

### Pool Configuration

For each pool, add two environment variables:

```bash
# Pool address
POOL_ADDRESS_<ALIAS>=0x...

# Feed address (after deployment)
CUSTOM_FEED_ADDRESS_<ALIAS>=0x...
```

Example:
```bash
POOL_ADDRESS_FXRP_USDTO=0x0b40111b4cf6dd1001f36f9c631956fefa56bc3b
CUSTOM_FEED_ADDRESS_FXRP_USDTO=0xYourFeedAddress
```

### Bot Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `BOT_CHECK_INTERVAL_SECONDS` | 60 | How often to check pools |
| `BOT_STATS_INTERVAL_MINUTES` | 60 | Stats print frequency |
| `BOT_LOG_LEVEL` | compact | `compact` or `verbose` |
| `BOT_LOG_FILE_ENABLED` | true | Enable JSON file logging |
| `BOT_LOG_FILE_DIR` | ./logs | Log file directory |

### Price Inversion

By default, prices are calculated as token1/token0 (standard V3 convention). If you need the inverse:

```bash
INVERT_PRICE=true
```

## Cost Analysis

Approximate costs per price update on Flare mainnet:

| Operation | Gas | Cost (at 25 gwei) |
|-----------|-----|-------------------|
| recordPrice() | ~80,000 | ~0.002 FLR |
| FDC Attestation | - | ~1.0 FLR |
| updateFromProof() | ~150,000 | ~0.004 FLR |
| **Total per update** | - | **~1.01 FLR** |

Monthly costs (5-minute intervals):
- **1 pool**: ~8,640 updates × 1.01 FLR ≈ **8,726 FLR/month**
- **5 pools**: ~43,200 updates × 1.01 FLR ≈ **43,632 FLR/month**

## Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile contracts |
| `npm run deploy:recorder` | Deploy PriceRecorder |
| `npm run deploy:feed` | Deploy PoolPriceCustomFeed |
| `npm run enable:pool` | Enable a pool on PriceRecorder |
| `npm run bot:start` | Start the combined bot |
| `npm run test:record` | Test price recording |
| `npm run test:feed` | Test feed read functions |
| `npm run clean` | Remove build artifacts |

## Architecture

```
flare-custom-feeds-toolkit/
├── contracts/
│   ├── PriceRecorder.sol      # Records V3 pool prices
│   └── PoolPriceCustomFeed.sol # FDC-verified custom feed
├── scripts/
│   ├── deploy-price-recorder.js
│   ├── deploy-custom-feed.js
│   ├── enable-pool.js
│   ├── test-record-price.js
│   └── test-feed-read.js
├── src/
│   ├── fdc-client.js          # FDC API interactions
│   └── custom-feeds-bot.js    # Combined recording + attestation bot
├── artifacts/                  # Pre-compiled ABIs
│   ├── PriceRecorder.json
│   └── PoolPriceCustomFeed.json
├── logs/                       # Bot JSON logs
├── hardhat.config.cjs
├── package.json
├── .env.example
└── README.md
```

## Troubleshooting

### "Pool not enabled"

Run the enable-pool script:
```bash
POOL_ADDRESS=0x... npm run enable:pool
```

### "Update interval not elapsed"

The PriceRecorder has a minimum interval between updates (default: 5 minutes). Wait for the interval to pass or adjust `UPDATE_INTERVAL` before deployment.

### "Attestation did not finalize in time"

FDC attestations typically take 90-180 seconds. If consistently failing:
- Check your RPC connection
- Verify the FDC system is operational
- Increase the timeout in the bot configuration

### "Invalid FDC proof"

The proof must come from a transaction on the same chain where the feed is deployed. Ensure:
- `PriceRecorder` and `PoolPriceCustomFeed` are on the same network
- The proof was retrieved from the correct voting round

### "Low balance" warning

The bot monitors your wallet balance and will stop if it drops too low. Ensure you have sufficient FLR for:
- Gas costs (~0.01 FLR per cycle)
- FDC attestation fees (~1 FLR per attestation)

## Testing on Coston2 (Testnet)

To test before mainnet deployment:

1. Get testnet tokens from the [Flare Faucet](https://faucet.flare.network)

2. Update `.env`:
```bash
FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
```

3. Deploy with network flag:
```bash
npx hardhat run scripts/deploy-price-recorder.js --network coston2
```

## Security Considerations

- **Private Key**: Never commit your private key. Use environment variables or secure key management.
- **FDC Proofs**: All prices are cryptographically verified by the Flare Data Connector.
- **Ownership**: Contracts have owner-only admin functions. Consider a multisig for production.
- **Monitoring**: Enable JSON logging and set up alerts for failures.

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## Support

- [Flare Documentation](https://docs.flare.network)
- [FDC Documentation](https://docs.flare.network/tech/fdc/)
- [Flare Discord](https://discord.flare.network)

