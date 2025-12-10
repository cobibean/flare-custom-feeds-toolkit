'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFeeds } from '@/context/feeds-context';
import { usePoolInfo } from '@/hooks/use-pool-info';
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { 
  Rocket, 
  Database, 
  ChevronDown, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  Copy
} from 'lucide-react';
import { getExplorerUrl } from '@/lib/wagmi-config';
import type { NetworkId } from '@/lib/types';
import { PRICE_RECORDER_ABI, PRICE_RECORDER_BYTECODE } from '@/lib/artifacts/PriceRecorder';
import { POOL_PRICE_CUSTOM_FEED_ABI, POOL_PRICE_CUSTOM_FEED_BYTECODE, FDC_VERIFICATION_ADDRESS } from '@/lib/artifacts/PoolPriceCustomFeed';

type DeployStep = 'select' | 'configure' | 'review' | 'deploying' | 'success' | 'error';

export default function DeployPage() {
  const { recorders, addRecorder, addFeed } = useFeeds();
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const networkId: NetworkId = chainId === 14 ? 'flare' : 'coston2';
  const networkRecorders = recorders.filter(r => r.network === networkId);

  // Deploy type selection
  const [deployType, setDeployType] = useState<'recorder' | 'feed' | null>(null);
  const [step, setStep] = useState<DeployStep>('select');

  // Recorder config
  const [updateInterval, setUpdateInterval] = useState('300');

  // Feed config
  const [selectedRecorder, setSelectedRecorder] = useState<string>('');
  const [poolAddress, setPoolAddress] = useState('');
  const [feedAlias, setFeedAlias] = useState('');
  const [invertPrice, setInvertPrice] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualToken0Decimals, setManualToken0Decimals] = useState('');
  const [manualToken1Decimals, setManualToken1Decimals] = useState('');

  // Pool auto-detection
  const { data: poolInfo, isLoading: poolLoading } = usePoolInfo(
    poolAddress.length === 42 ? poolAddress : undefined
  );

  // Deploy state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleReset = () => {
    setDeployType(null);
    setStep('select');
    setUpdateInterval('300');
    setSelectedRecorder('');
    setPoolAddress('');
    setFeedAlias('');
    setInvertPrice(false);
    setShowAdvanced(false);
    setManualToken0Decimals('');
    setManualToken1Decimals('');
    setDeployedAddress('');
    setTxHash('');
    setError('');
  };

  const handleDeployRecorder = async () => {
    if (!walletClient || !publicClient || !address) {
      toast.error('Wallet not connected');
      return;
    }

    setStep('deploying');
    setIsDeploying(true);
    setError('');

    try {
      const interval = parseInt(updateInterval) || 300;

      toast.info('Deploying PriceRecorder...', {
        description: `Update interval: ${interval}s`,
      });

      // Deploy the PriceRecorder contract
      const hash = await walletClient.deployContract({
        abi: PRICE_RECORDER_ABI,
        bytecode: PRICE_RECORDER_BYTECODE,
        args: [BigInt(interval)],
        account: address,
      });

      setTxHash(hash);
      toast.info('Transaction submitted, waiting for confirmation...');

      // Wait for deployment
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (!receipt.contractAddress) {
        throw new Error('Contract address not found in receipt');
      }

      const contractAddress = receipt.contractAddress;
      setDeployedAddress(contractAddress);

      // Save to local storage
      addRecorder({
        id: uuidv4(),
        address: contractAddress as `0x${string}`,
        network: networkId,
        updateInterval: interval,
        deployedAt: new Date().toISOString(),
        deployedBy: address,
      });

      toast.success('PriceRecorder deployed successfully!');
      setStep('success');

    } catch (e) {
      console.error('Deploy error:', e);
      setError(e instanceof Error ? e.message : 'Deployment failed');
      setStep('error');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDeployFeed = async () => {
    if (!walletClient || !publicClient || !address) {
      toast.error('Wallet not connected');
      return;
    }

    if (!poolInfo && !manualToken0Decimals) {
      toast.error('Pool info not loaded');
      return;
    }

    setStep('deploying');
    setIsDeploying(true);
    setError('');

    try {
      const token0Dec = parseInt(manualToken0Decimals) || poolInfo?.token0Decimals || 18;
      const token1Dec = parseInt(manualToken1Decimals) || poolInfo?.token1Decimals || 18;

      toast.info('Deploying PoolPriceCustomFeed...', {
        description: `${feedAlias} for pool ${poolAddress.slice(0, 10)}...`,
      });

      // Deploy the PoolPriceCustomFeed contract
      const hash = await walletClient.deployContract({
        abi: POOL_PRICE_CUSTOM_FEED_ABI,
        bytecode: POOL_PRICE_CUSTOM_FEED_BYTECODE,
        args: [
          selectedRecorder as `0x${string}`,  // _priceRecorder
          poolAddress as `0x${string}`,        // _poolAddress
          feedAlias,                           // _feedName
          FDC_VERIFICATION_ADDRESS,            // _fdcVerificationAddress
          token0Dec,                           // _token0Decimals
          token1Dec,                           // _token1Decimals
          invertPrice,                         // _invertPrice
        ],
        account: address,
      });

      setTxHash(hash);
      toast.info('Transaction submitted, waiting for confirmation...');

      // Wait for deployment
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (!receipt.contractAddress) {
        throw new Error('Contract address not found in receipt');
      }

      const contractAddress = receipt.contractAddress;
      setDeployedAddress(contractAddress);

      // Save to local storage
      addFeed({
        id: uuidv4(),
        alias: feedAlias,
        network: networkId,
        poolAddress: poolAddress as `0x${string}`,
        customFeedAddress: contractAddress as `0x${string}`,
        priceRecorderAddress: selectedRecorder as `0x${string}`,
        token0: {
          address: poolInfo?.token0 || '0x0000000000000000000000000000000000000000' as `0x${string}`,
          symbol: poolInfo?.token0Symbol || 'TOKEN0',
          decimals: token0Dec,
        },
        token1: {
          address: poolInfo?.token1 || '0x0000000000000000000000000000000000000000' as `0x${string}`,
          symbol: poolInfo?.token1Symbol || 'TOKEN1',
          decimals: token1Dec,
        },
        invertPrice: invertPrice,
        deployedAt: new Date().toISOString(),
        deployedBy: address,
      });

      toast.success('Custom Feed deployed successfully!');
      setStep('success');

    } catch (e) {
      console.error('Deploy error:', e);
      setError(e instanceof Error ? e.message : 'Deployment failed');
      setStep('error');
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Deploy" 
        description="Deploy price recorders and custom feeds"
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Step: Select Deploy Type */}
        {step === 'select' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className={`cursor-pointer transition-all hover:border-brand-500 ${
                deployType === 'recorder' ? 'border-brand-500 bg-brand-500/5' : ''
              }`}
              onClick={() => setDeployType('recorder')}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4">
                  <Database className="w-6 h-6 text-brand-500" />
                </div>
                <CardTitle>Price Recorder</CardTitle>
                <CardDescription>
                  Deploy a new PriceRecorder contract to capture pool prices on-chain
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">Required first</Badge>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${
                networkRecorders.length === 0 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:border-brand-500'
              } ${deployType === 'feed' ? 'border-brand-500 bg-brand-500/5' : ''}`}
              onClick={() => networkRecorders.length > 0 && setDeployType('feed')}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4">
                  <Rocket className="w-6 h-6 text-brand-500" />
                </div>
                <CardTitle>Custom Feed</CardTitle>
                <CardDescription>
                  Create a new custom price feed for a Uniswap V3 pool
                </CardDescription>
              </CardHeader>
              <CardContent>
                {networkRecorders.length === 0 ? (
                  <Badge variant="secondary">Deploy recorder first</Badge>
                ) : (
                  <Badge variant="outline">{networkRecorders.length} recorder(s) available</Badge>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recorder Configuration */}
        {step === 'select' && deployType === 'recorder' && (
          <Card>
            <CardHeader>
              <CardTitle>Configure Price Recorder</CardTitle>
              <CardDescription>
                Set the update interval for price recordings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="updateInterval">Update Interval (seconds)</Label>
                <Input
                  id="updateInterval"
                  type="number"
                  value={updateInterval}
                  onChange={(e) => setUpdateInterval(e.target.value)}
                  placeholder="300"
                  min="60"
                />
                <p className="text-sm text-muted-foreground">
                  Minimum time between price updates. Default: 300s (5 minutes)
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
                <Button 
                  className="bg-brand-500 hover:bg-brand-600"
                  onClick={handleDeployRecorder}
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy Recorder
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feed Configuration */}
        {step === 'select' && deployType === 'feed' && (
          <Card>
            <CardHeader>
              <CardTitle>Configure Custom Feed</CardTitle>
              <CardDescription>
                Enter the V3 pool details to create your custom feed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Recorder Selection */}
              <div className="space-y-2">
                <Label>Price Recorder</Label>
                <select
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  value={selectedRecorder}
                  onChange={(e) => setSelectedRecorder(e.target.value)}
                >
                  <option value="">Select a recorder...</option>
                  {networkRecorders.map((r) => (
                    <option key={r.id} value={r.address}>
                      {r.address.slice(0, 10)}...{r.address.slice(-8)} (interval: {r.updateInterval}s)
                    </option>
                  ))}
                </select>
              </div>

              {/* Pool Address */}
              <div className="space-y-2">
                <Label htmlFor="poolAddress">V3 Pool Address</Label>
                <Input
                  id="poolAddress"
                  value={poolAddress}
                  onChange={(e) => setPoolAddress(e.target.value)}
                  placeholder="0x..."
                />
                {poolLoading && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading pool info...
                  </p>
                )}
                {poolInfo && (
                  <div className="p-3 rounded-lg bg-secondary/50 space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Pool detected
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {poolInfo.token0Symbol}/{poolInfo.token1Symbol} ({poolInfo.token0Decimals}/{poolInfo.token1Decimals} decimals)
                    </p>
                  </div>
                )}
              </div>

              {/* Feed Alias */}
              <div className="space-y-2">
                <Label htmlFor="feedAlias">Feed Alias</Label>
                <Input
                  id="feedAlias"
                  value={feedAlias}
                  onChange={(e) => setFeedAlias(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  placeholder="e.g., WFLR_USDT"
                  maxLength={20}
                />
                <p className="text-sm text-muted-foreground">
                  Uppercase letters, numbers, underscores only. Max 20 chars.
                </p>
              </div>

              {/* Invert Price */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="invertPrice">Invert Price</Label>
                  <p className="text-sm text-muted-foreground">
                    Show price as token1/token0 instead of token0/token1
                  </p>
                </div>
                <Switch
                  id="invertPrice"
                  checked={invertPrice}
                  onCheckedChange={setInvertPrice}
                />
              </div>

              {/* Advanced Options */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    Advanced Options
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="token0Decimals">Token0 Decimals</Label>
                      <Input
                        id="token0Decimals"
                        type="number"
                        value={manualToken0Decimals || poolInfo?.token0Decimals?.toString() || ''}
                        onChange={(e) => setManualToken0Decimals(e.target.value)}
                        placeholder={poolInfo?.token0Decimals?.toString() || '18'}
                        min="0"
                        max="18"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="token1Decimals">Token1 Decimals</Label>
                      <Input
                        id="token1Decimals"
                        type="number"
                        value={manualToken1Decimals || poolInfo?.token1Decimals?.toString() || ''}
                        onChange={(e) => setManualToken1Decimals(e.target.value)}
                        placeholder={poolInfo?.token1Decimals?.toString() || '18'}
                        min="0"
                        max="18"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
                <Button 
                  className="bg-brand-500 hover:bg-brand-600"
                  onClick={handleDeployFeed}
                  disabled={!selectedRecorder || !poolAddress || !feedAlias}
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy Feed
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deploying State */}
        {step === 'deploying' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Deploying Contract</h3>
              <p className="text-muted-foreground">
                Please confirm the transaction in your wallet...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {step === 'success' && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Deployment Successful!</h3>
              <p className="text-muted-foreground mb-6">
                Your contract has been deployed successfully.
              </p>
              
              <div className="max-w-md mx-auto space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-sm text-muted-foreground">Contract Address</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">
                      {deployedAddress.slice(0, 10)}...{deployedAddress.slice(-8)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(deployedAddress)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <a
                      href={getExplorerUrl(chainId, 'address', deployedAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </div>

                {txHash && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <span className="text-sm text-muted-foreground">Transaction</span>
                    <a
                      href={getExplorerUrl(chainId, 'tx', txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-500 hover:underline flex items-center gap-1"
                    >
                      View on Explorer
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <Button className="mt-6" onClick={handleReset}>
                Deploy Another
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {step === 'error' && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Deployment Failed</h3>
              <Alert variant="destructive" className="max-w-md mx-auto mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={handleReset}>
                  Start Over
                </Button>
                <Button 
                  className="bg-brand-500 hover:bg-brand-600"
                  onClick={() => {
                    setStep('select');
                    setError('');
                  }}
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info about existing recorders */}
        {step === 'select' && !deployType && networkRecorders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Existing Recorders on {networkId === 'flare' ? 'Mainnet' : 'Coston2'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {networkRecorders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <code className="text-sm font-mono">{r.address}</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Update interval: {r.updateInterval}s
                      </p>
                    </div>
                    <a
                      href={getExplorerUrl(chainId, 'address', r.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

