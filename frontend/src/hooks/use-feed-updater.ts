'use client';

import { useState, useCallback } from 'react';
import { usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { encodeAbiParameters, parseAbiParameters, decodeAbiParameters } from 'viem';

// FDC Contract Addresses
const FDC_CONFIG = {
  // Flare Mainnet
  14: {
    FDC_HUB: '0xc25c749DC27Efb1864Cb3DADa8845B7687eB2d44' as `0x${string}`,
    RELAY: '0x57a4c3676d08Aa5d15410b5A6A80fBcEF72f3F45' as `0x${string}`,
    SOURCE_ID: '0x464c520000000000000000000000000000000000000000000000000000000000', // FLR
  },
  // Coston2 Testnet
  114: {
    FDC_HUB: '0x48aC463d7975828989331836548F74Cf28Fc1e60' as `0x${string}`,
    RELAY: '0x5CdF9eAF3EB8b44fB696984a1420B56A7575D250' as `0x${string}`,
    SOURCE_ID: '0x7465737443324652000000000000000000000000000000000000000000000000', // testC2FR
  },
} as const;

// ABIs
const FDC_HUB_ABI = [
  {
    inputs: [{ name: '_data', type: 'bytes' }],
    name: 'requestAttestation',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'fdcRequestFeeConfigurations',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const RELAY_ABI = [
  {
    inputs: [
      { name: '_attestationType', type: 'uint256' },
      { name: '_votingRound', type: 'uint256' },
    ],
    name: 'isFinalized',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_timestamp', type: 'uint256' }],
    name: 'getVotingRoundId',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const FEE_CONFIG_ABI = [
  {
    inputs: [{ name: '_data', type: 'bytes' }],
    name: 'getRequestFee',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const PRICE_RECORDER_ABI = [
  {
    inputs: [{ name: 'pool', type: 'address' }],
    name: 'recordPrice',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'pool', type: 'address' }],
    name: 'canUpdate',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'pool', type: 'address' }],
    name: 'enabledPools',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'pool', type: 'address' }],
    name: 'enablePool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'pool', type: 'address' },
      { indexed: false, name: 'sqrtPriceX96', type: 'uint160' },
      { indexed: false, name: 'tick', type: 'int24' },
      { indexed: false, name: 'liquidity', type: 'uint128' },
      { indexed: false, name: 'token0', type: 'address' },
      { indexed: false, name: 'token1', type: 'address' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
      { indexed: false, name: 'blockNumber', type: 'uint256' },
    ],
    name: 'PriceRecorded',
    type: 'event',
  },
] as const;

const CUSTOM_FEED_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'merkleProof', type: 'bytes32[]' },
          {
            components: [
              { name: 'attestationType', type: 'bytes32' },
              { name: 'sourceId', type: 'bytes32' },
              { name: 'votingRound', type: 'uint64' },
              { name: 'lowestUsedTimestamp', type: 'uint64' },
              {
                components: [
                  { name: 'transactionHash', type: 'bytes32' },
                  { name: 'requiredConfirmations', type: 'uint16' },
                  { name: 'provideInput', type: 'bool' },
                  { name: 'listEvents', type: 'bool' },
                  { name: 'logIndices', type: 'uint32[]' },
                ],
                name: 'requestBody',
                type: 'tuple',
              },
              {
                components: [
                  { name: 'blockNumber', type: 'uint64' },
                  { name: 'timestamp', type: 'uint64' },
                  { name: 'sourceAddress', type: 'address' },
                  { name: 'isDeployment', type: 'bool' },
                  { name: 'receivingAddress', type: 'address' },
                  { name: 'value', type: 'uint256' },
                  { name: 'input', type: 'bytes' },
                  { name: 'status', type: 'uint8' },
                  {
                    components: [
                      { name: 'logIndex', type: 'uint32' },
                      { name: 'emitterAddress', type: 'address' },
                      { name: 'topics', type: 'bytes32[]' },
                      { name: 'data', type: 'bytes' },
                      { name: 'removed', type: 'bool' },
                    ],
                    name: 'events',
                    type: 'tuple[]',
                  },
                ],
                name: 'responseBody',
                type: 'tuple',
              },
            ],
            name: 'data',
            type: 'tuple',
          },
        ],
        name: '_proof',
        type: 'tuple',
      },
    ],
    name: 'updateFromProof',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestValue',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lastUpdateTimestamp',
    outputs: [{ type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'updateCount',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export type UpdateStep = 
  | 'idle'
  | 'checking'
  | 'enabling-pool'
  | 'recording'
  | 'requesting-attestation'
  | 'waiting-finalization'
  | 'retrieving-proof'
  | 'submitting-proof'
  | 'success'
  | 'error';

interface UpdateProgress {
  step: UpdateStep;
  message: string;
  elapsed?: number;
  txHash?: string;
  error?: string;
}

interface UseFeedUpdaterResult {
  updateFeed: (
    priceRecorderAddress: `0x${string}`,
    poolAddress: `0x${string}`,
    feedAddress: `0x${string}`
  ) => Promise<void>;
  progress: UpdateProgress;
  isUpdating: boolean;
  cancel: () => void;
}

export function useFeedUpdater(): UseFeedUpdaterResult {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const [progress, setProgress] = useState<UpdateProgress>({
    step: 'idle',
    message: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const cancel = useCallback(() => {
    setCancelled(true);
  }, []);

  const updateFeed = useCallback(async (
    priceRecorderAddress: `0x${string}`,
    poolAddress: `0x${string}`,
    feedAddress: `0x${string}`
  ) => {
    if (!publicClient || !walletClient) {
      throw new Error('Wallet not connected');
    }

    const config = FDC_CONFIG[chainId as keyof typeof FDC_CONFIG];
    if (!config) {
      throw new Error(`Unsupported network (chainId: ${chainId})`);
    }

    setIsUpdating(true);
    setCancelled(false);
    const startTime = Date.now();

    const updateProgress = (step: UpdateStep, message: string, extra?: Partial<UpdateProgress>) => {
      setProgress({
        step,
        message,
        elapsed: Math.floor((Date.now() - startTime) / 1000),
        ...extra,
      });
    };

    try {
      // Step 1: Check if pool is enabled on recorder
      updateProgress('checking', 'Checking pool status...');
      
      const isEnabled = await publicClient.readContract({
        address: priceRecorderAddress,
        abi: PRICE_RECORDER_ABI,
        functionName: 'enabledPools',
        args: [poolAddress],
      });

      // If pool is not enabled, enable it first
      if (!isEnabled) {
        updateProgress('enabling-pool', 'Pool not enabled on recorder. Please confirm transaction to enable...');
        
        const enableHash = await walletClient.writeContract({
          address: priceRecorderAddress,
          abi: PRICE_RECORDER_ABI,
          functionName: 'enablePool',
          args: [poolAddress],
        });

        updateProgress('enabling-pool', 'Waiting for pool enable confirmation...');
        const enableReceipt = await publicClient.waitForTransactionReceipt({ hash: enableHash });
        
        if (enableReceipt.status === 'reverted') {
          throw new Error('Failed to enable pool on recorder');
        }

        updateProgress('enabling-pool', 'Pool enabled successfully! Continuing...');
        // Small delay to let user see the success
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Now check if can update (interval check)
      const canUpdate = await publicClient.readContract({
        address: priceRecorderAddress,
        abi: PRICE_RECORDER_ABI,
        functionName: 'canUpdate',
        args: [poolAddress],
      });

      if (!canUpdate) {
        throw new Error('Pool cannot be updated yet (interval not elapsed). Please wait a few minutes.');
      }

      // Step 2: Record price
      updateProgress('recording', 'Recording price on-chain...');

      const recordHash = await walletClient.writeContract({
        address: priceRecorderAddress,
        abi: PRICE_RECORDER_ABI,
        functionName: 'recordPrice',
        args: [poolAddress],
      });

      updateProgress('recording', 'Waiting for confirmation...', { txHash: recordHash });

      const recordReceipt = await publicClient.waitForTransactionReceipt({ hash: recordHash });
      
      if (recordReceipt.status === 'reverted') {
        throw new Error('Record transaction reverted');
      }

      if (cancelled) throw new Error('Cancelled by user');

      // Step 3: Request FDC attestation
      updateProgress('requesting-attestation', 'Preparing attestation request...');

      // Call verifier API via our proxy to avoid CORS
      const verifierResponse = await fetch('/api/fdc/prepare-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chainId,
          attestationType: '0x45564d5472616e73616374696f6e000000000000000000000000000000000000',
          sourceId: config.SOURCE_ID,
          requestBody: {
            transactionHash: recordHash,
            requiredConfirmations: '1',
            provideInput: false,
            listEvents: true,
            logIndices: [],
          },
        }),
      });

      if (!verifierResponse.ok) {
        const errorData = await verifierResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to prepare attestation request');
      }

      const verifierData = await verifierResponse.json();
      const requestBytes = verifierData.abiEncodedRequest as `0x${string}`;

      if (cancelled) throw new Error('Cancelled by user');

      // Get attestation fee
      updateProgress('requesting-attestation', 'Getting attestation fee...');

      let fee: bigint;
      try {
        const feeConfigAddress = await publicClient.readContract({
          address: config.FDC_HUB,
          abi: FDC_HUB_ABI,
          functionName: 'fdcRequestFeeConfigurations',
        });

        fee = await publicClient.readContract({
          address: feeConfigAddress,
          abi: FEE_CONFIG_ABI,
          functionName: 'getRequestFee',
          args: [requestBytes],
        });
      } catch {
        // Fallback fee: 1 FLR
        fee = 1000000000000000000n;
      }

      // Submit attestation request
      updateProgress('requesting-attestation', `Submitting attestation request (fee: ${(Number(fee) / 1e18).toFixed(2)} FLR)...`);

      const attestHash = await walletClient.writeContract({
        address: config.FDC_HUB,
        abi: FDC_HUB_ABI,
        functionName: 'requestAttestation',
        args: [requestBytes],
        value: fee,
      });

      const attestReceipt = await publicClient.waitForTransactionReceipt({ hash: attestHash });

      if (attestReceipt.status === 'reverted') {
        throw new Error('Attestation request reverted');
      }

      // Get voting round ID
      const block = await publicClient.getBlock({ blockNumber: attestReceipt.blockNumber });
      
      const votingRoundId = await publicClient.readContract({
        address: config.RELAY,
        abi: RELAY_ABI,
        functionName: 'getVotingRoundId',
        args: [block.timestamp],
      });

      if (cancelled) throw new Error('Cancelled by user');

      // Step 4: Wait for finalization
      updateProgress('waiting-finalization', `Waiting for FDC finalization (Round ${votingRoundId})...`);

      const maxWaitMs = 300000; // 5 minutes
      const pollInterval = 10000; // 10 seconds
      const waitStart = Date.now();

      while (Date.now() - waitStart < maxWaitMs) {
        if (cancelled) throw new Error('Cancelled by user');

        const isFinalized = await publicClient.readContract({
          address: config.RELAY,
          abi: RELAY_ABI,
          functionName: 'isFinalized',
          args: [200n, votingRoundId], // 200 = EVMTransaction attestation type
        });

        if (isFinalized) {
          break;
        }

        const waitedSecs = Math.floor((Date.now() - waitStart) / 1000);
        updateProgress('waiting-finalization', `Waiting for finalization... (${waitedSecs}s)`);
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      // Additional wait for DA Layer sync
      updateProgress('waiting-finalization', 'Waiting for DA Layer sync...');
      await new Promise(resolve => setTimeout(resolve, 30000));

      if (cancelled) throw new Error('Cancelled by user');

      // Step 5: Retrieve proof from DA Layer via our proxy
      updateProgress('retrieving-proof', 'Retrieving proof from DA Layer...');

      const proofResponse = await fetch('/api/fdc/get-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId,
          votingRoundId: Number(votingRoundId),
          requestBytes: requestBytes,
        }),
      });

      if (!proofResponse.ok) {
        const errorData = await proofResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to retrieve proof from DA Layer');
      }

      const proofData = await proofResponse.json();

      if (!proofData.response_hex) {
        throw new Error('Invalid proof response - attestation may not be ready yet');
      }

      if (cancelled) throw new Error('Cancelled by user');

      // Step 6: Parse and submit proof to feed
      updateProgress('submitting-proof', 'Submitting proof to feed contract...');

      // Decode the response
      const RESPONSE_TUPLE_TYPE = `(bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, (bytes32 transactionHash, uint16 requiredConfirmations, bool provideInput, bool listEvents, uint32[] logIndices) requestBody, (uint64 blockNumber, uint64 timestamp, address sourceAddress, bool isDeployment, address receivingAddress, uint256 value, bytes input, uint8 status, (uint32 logIndex, address emitterAddress, bytes32[] topics, bytes data, bool removed)[] events) responseBody)`;
      
      const [decodedResponse] = decodeAbiParameters(
        parseAbiParameters(RESPONSE_TUPLE_TYPE),
        proofData.response_hex as `0x${string}`
      );

      // Format proof for contract
      const proofStruct = {
        merkleProof: (proofData.proof || []) as `0x${string}`[],
        data: {
          attestationType: decodedResponse.attestationType,
          sourceId: decodedResponse.sourceId,
          votingRound: decodedResponse.votingRound,
          lowestUsedTimestamp: decodedResponse.lowestUsedTimestamp,
          requestBody: {
            transactionHash: decodedResponse.requestBody.transactionHash,
            requiredConfirmations: decodedResponse.requestBody.requiredConfirmations,
            provideInput: decodedResponse.requestBody.provideInput,
            listEvents: decodedResponse.requestBody.listEvents,
            logIndices: [...decodedResponse.requestBody.logIndices],
          },
          responseBody: {
            blockNumber: decodedResponse.responseBody.blockNumber,
            timestamp: decodedResponse.responseBody.timestamp,
            sourceAddress: decodedResponse.responseBody.sourceAddress,
            isDeployment: decodedResponse.responseBody.isDeployment,
            receivingAddress: decodedResponse.responseBody.receivingAddress,
            value: decodedResponse.responseBody.value,
            input: decodedResponse.responseBody.input,
            status: decodedResponse.responseBody.status,
            events: decodedResponse.responseBody.events.map((event: any) => ({
              logIndex: Number(event.logIndex),
              emitterAddress: event.emitterAddress,
              topics: event.topics,
              data: event.data,
              removed: event.removed,
            })),
          },
        },
      };

      const updateHash = await walletClient.writeContract({
        address: feedAddress,
        abi: CUSTOM_FEED_ABI,
        functionName: 'updateFromProof',
        args: [proofStruct],
      });

      const updateReceipt = await publicClient.waitForTransactionReceipt({ hash: updateHash });

      if (updateReceipt.status === 'reverted') {
        throw new Error('Update proof transaction reverted');
      }

      // Success!
      updateProgress('success', 'Feed updated successfully!', { txHash: updateHash });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setProgress({
        step: 'error',
        message: errorMessage,
        elapsed: Math.floor((Date.now() - startTime) / 1000),
        error: errorMessage,
      });
    } finally {
      setIsUpdating(false);
    }
  }, [publicClient, walletClient, chainId, cancelled]);

  return {
    updateFeed,
    progress,
    isUpdating,
    cancel,
  };
}

