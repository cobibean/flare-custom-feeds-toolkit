# Codebase Context: Flare Custom Feeds Toolkit

> AI-optimized reference for understanding this codebase. Read this first.

## Purpose

Creates FDC-verified custom price feeds from Uniswap V3 pools on Flare. Implements `IICustomFeed` interface for FTSO compatibility.

## Data Flow

```
V3Pool.slot0() → PriceRecorder.recordPrice() → FDC attestation → CustomFeed.updateFromProof()
```

1. Bot calls `recordPrice(pool)` → emits `PriceRecorded` event
2. Bot requests FDC attestation via FdcHub (pays ~1 FLR fee)
3. After ~90-180s finalization, bot retrieves proof from DA Layer
4. Bot submits proof to `CustomFeed.updateFromProof()` → stores verified price

## File Structure

```
contracts/
├── PriceRecorder.sol      # Shared recorder (one per project)
└── PoolPriceCustomFeed.sol # Feed contract (one per pool)
scripts/
├── deploy-price-recorder.js
├── deploy-custom-feed.js
├── enable-pool.js
├── test-record-price.js
└── test-feed-read.js
src/
├── custom-feeds-bot.js    # Main bot (recording + attestation)
└── fdc-client.js          # FDC API wrapper
```

## Smart Contracts

### PriceRecorder.sol

Reads V3 pool prices and emits attestable events.

```solidity
// Key state
mapping(address => bool) public enabledPools;
mapping(address => PoolInfo) public poolInfo;
uint256 public updateInterval; // seconds between updates

// Key functions
function recordPrice(address pool) external;           // Main entry
function recordPriceBatch(address[] calldata) external; // Batch (max 50)
function enablePool(address pool) external onlyOwner;
function canUpdate(address pool) external view returns (bool);

// Key event (attested by FDC)
event PriceRecorded(
    address indexed pool,
    uint160 sqrtPriceX96,  // V3 price format
    int24 tick,
    uint128 liquidity,
    address token0,
    address token1,
    uint256 timestamp,
    uint256 blockNumber
);
```

### PoolPriceCustomFeed.sol

FDC-verified feed implementing `IICustomFeed`.

```solidity
// Immutable config (set at deploy)
address public immutable priceRecorderAddress;
address public immutable poolAddress;
uint8 public immutable token0Decimals;
uint8 public immutable token1Decimals;
bool public immutable invertPrice;
bytes21 private immutable _feedId; // 0x21 prefix = custom feed

// State
uint256 public latestValue;        // 6 decimals
uint64 public lastUpdateTimestamp;
uint256 public updateCount;

// IICustomFeed interface
function feedId() external view returns (bytes21);
function read() external view returns (uint256);
function decimals() external pure returns (int8);     // Always 6
function calculateFee() external pure returns (uint256); // Always 0
function getCurrentFeed() external payable returns (uint256, int8, uint64);

// Core update
function updateFromProof(IEVMTransaction.Proof calldata _proof) external;
```

**Price Calculation** (from sqrtPriceX96):
```solidity
// price = (sqrtPriceX96 / 2^96)^2 * 10^18
// Then adjust for token decimals: price *= 10^(decimals0 - decimals1)
// Scale to 6 decimals: price /= 10^12
// If invertPrice: price = 10^12 / price
```

## Bot (custom-feeds-bot.js)

Single process handling both recording and attestation.

### Configuration Discovery

```javascript
// Auto-discovers pools from env vars matching pattern:
// POOL_ADDRESS_<ALIAS> + CUSTOM_FEED_ADDRESS_<ALIAS>
// Example: POOL_ADDRESS_FXRP_USDTO, CUSTOM_FEED_ADDRESS_FXRP_USDTO
```

### Main Loop

```javascript
while (running) {
  pool = getNextPoolToProcess(); // round-robin
  if (pool && canUpdate(pool)) {
    result = await recordPrice(pool);
    if (result) await attestAndUpdate(result);
  }
  await sleep(CHECK_INTERVAL);
}
```

### Key Config

```javascript
CHECK_INTERVAL: 60s        // Main loop frequency
MAX_GAS_PRICE_GWEI: 100
MIN_BALANCE_FLR: 1.0
CRITICAL_BALANCE_FLR: 0.1  // Bot stops below this
MAX_ATTESTATION_RETRIES: 2
```

## FDC Client (fdc-client.js)

Handles Flare Data Connector workflow.

### Addresses (Mainnet)

```javascript
FDC_HUB = "0xc25c749DC27Efb1864Cb3DADa8845B7687eB2d44";
RELAY = "0x57a4c3676d08Aa5d15410b5A6A80fBcEF72f3F45";
CONTRACT_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
DA_LAYER_API = "https://flr-data-availability.flare.network";
VERIFIER_URL = "https://fdc-verifiers-mainnet.flare.network/verifier/flr/EVMTransaction/prepareRequest";
```

### Workflow

```javascript
async function getProofForTransaction(provider, wallet, txHash) {
  // 1. Prepare request via verifier (gets MIC)
  requestBytes = await prepareAttestationRequest(txHash);
  
  // 2. Submit to FdcHub with fee
  await fdcHub.requestAttestation(requestBytes, { value: fee });
  votingRoundId = await relay.getVotingRoundId(blockTimestamp);
  
  // 3. Wait for finalization (~90-180s)
  await waitForFinalization(votingRoundId);
  
  // 4. Retrieve proof from DA Layer
  proof = await retrieveProof(votingRoundId, requestBytes);
  return { responseHex, merkleProof, fdcRoundId };
}
```

### Attestation Request Format

```javascript
{
  attestationType: "0x45564d5472616e73616374696f6e...", // "EVMTransaction"
  sourceId: "0x464c52...",  // "FLR"
  requestBody: {
    transactionHash,
    requiredConfirmations: "1",
    provideInput: false,
    listEvents: true,
    logIndices: []
  }
}
```

## Environment Variables

```bash
# Required
DEPLOYER_PRIVATE_KEY=0x...
PRICE_RECORDER_ADDRESS=0x...

# Per pool (use consistent ALIAS)
POOL_ADDRESS_<ALIAS>=0x...
CUSTOM_FEED_ADDRESS_<ALIAS>=0x...

# Optional
FLARE_RPC_URL=https://flare-api.flare.network/ext/bc/C/rpc
BOT_CHECK_INTERVAL_SECONDS=60
BOT_LOG_LEVEL=compact|verbose
BOT_LOG_FILE_ENABLED=true
INVERT_PRICE=true|false
```

## Deployment Sequence

1. `npm run deploy:recorder` → Get PRICE_RECORDER_ADDRESS
2. `POOL_ADDRESS=0x... npm run enable:pool`
3. `FEED_ALIAS=XXX npm run deploy:feed` → Get CUSTOM_FEED_ADDRESS_XXX
4. `npm run bot:start`

## Networks

| Network | Chain ID | RPC |
|---------|----------|-----|
| Flare Mainnet | 14 | flare-api.flare.network |
| Coston2 Testnet | 114 | coston2-api.flare.network |

## Cost Per Update

- recordPrice(): ~0.002 FLR (gas)
- FDC attestation: ~1.0 FLR (fee)
- updateFromProof(): ~0.004 FLR (gas)
- **Total: ~1.01 FLR**

## Key Patterns

**Price with decimal adjustment:**
```javascript
const Q96 = 2n ** 96n;
let price = sqrtPriceX96 * sqrtPriceX96 * (10n ** 18n) / (Q96 * Q96);
const adj = token0Decimals - token1Decimals;
if (adj > 0) price *= 10n ** BigInt(adj);
else if (adj < 0) price /= 10n ** BigInt(-adj);
price /= 10n ** 12n; // scale to 6 decimals
if (invertPrice) price = (10n ** 12n) / price;
```

**Proof struct for contract:**
```javascript
{
  merkleProof: bytes32[],
  data: {
    attestationType, sourceId, votingRound, lowestUsedTimestamp,
    requestBody: { transactionHash, requiredConfirmations, provideInput, listEvents, logIndices },
    responseBody: { blockNumber, timestamp, sourceAddress, isDeployment, receivingAddress, value, input, status, events[] }
  }
}
```

## Dependencies

```json
{
  "axios": "^1.6.0",
  "dotenv": "^16.3.0",
  "ethers": "^6.9.0",
  "hardhat": "^2.19.0"
}
```

## Technical Notes

- Solidity 0.8.19, optimizer enabled (200 runs)
- Node.js ES modules (type: "module")
- Bot is single-threaded, round-robin pool processing
- Feed ID format: 0x21 + UTF-8 name bytes (max 20 chars)
- FDC attestation type ID: 200 (EVMTransaction)
- All contracts have owner-only admin functions

