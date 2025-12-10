'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFeeds } from '@/context/feeds-context';
import { useChainId, useReadContracts, useAccount } from 'wagmi';
import { CUSTOM_FEED_ABI } from '@/lib/contracts';
import { getExplorerUrl } from '@/lib/wagmi-config';
import { useFeedUpdater, type UpdateStep } from '@/hooks/use-feed-updater';
import { 
  Activity, 
  ExternalLink, 
  Copy, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Play,
  X,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { NetworkId, BotStatus, StoredFeed } from '@/lib/types';

function getBotStatus(lastUpdateTimestamp: number, updateInterval: number = 300): BotStatus {
  if (!lastUpdateTimestamp) return 'unknown';
  
  const now = Math.floor(Date.now() / 1000);
  const timeSinceUpdate = now - lastUpdateTimestamp;
  
  if (timeSinceUpdate < updateInterval * 1.5) return 'active';
  if (timeSinceUpdate < updateInterval * 5) return 'stale';
  return 'inactive';
}

function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return 'Never';
  
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatPrice(value: bigint | undefined): string {
  if (!value) return '—';
  const num = Number(value) / 1e6;
  if (num >= 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (num >= 1) return num.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return num.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

const STEP_PROGRESS: Record<UpdateStep, number> = {
  idle: 0,
  checking: 5,
  'enabling-pool': 10,
  recording: 15,
  'requesting-attestation': 30,
  'waiting-finalization': 50,
  'retrieving-proof': 80,
  'submitting-proof': 90,
  success: 100,
  error: 0,
};

interface FeedCardProps {
  feed: StoredFeed;
  chainId: number;
  onUpdateClick: () => void;
  isUpdating: boolean;
}

function FeedCard({ feed, chainId, onUpdateClick, isUpdating }: FeedCardProps) {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: feed.customFeedAddress,
        abi: CUSTOM_FEED_ABI,
        functionName: 'latestValue',
      },
      {
        address: feed.customFeedAddress,
        abi: CUSTOM_FEED_ABI,
        functionName: 'lastUpdateTimestamp',
      },
      {
        address: feed.customFeedAddress,
        abi: CUSTOM_FEED_ABI,
        functionName: 'updateCount',
      },
      {
        address: feed.customFeedAddress,
        abi: CUSTOM_FEED_ABI,
        functionName: 'feedId',
      },
    ],
  });

  const latestValue = data?.[0]?.result as bigint | undefined;
  const lastUpdateTimestamp = Number(data?.[1]?.result || 0);
  const updateCount = Number(data?.[2]?.result || 0);
  const feedId = data?.[3]?.result as string | undefined;

  const botStatus = getBotStatus(lastUpdateTimestamp);

  const statusConfig = {
    active: { color: 'bg-green-500', text: 'Active', icon: CheckCircle2 },
    stale: { color: 'bg-yellow-500', text: 'Stale', icon: Clock },
    inactive: { color: 'bg-red-500', text: 'Inactive', icon: AlertCircle },
    unknown: { color: 'bg-gray-500', text: 'Unknown', icon: Activity },
  };

  const status = statusConfig[botStatus];
  const StatusIcon = status.icon;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Card className="hover:border-brand-500/50 transition-colors overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg truncate">{feed.alias}</CardTitle>
            <Badge variant="outline" className="font-mono text-xs mt-1">
              {feed.token0.symbol}/{feed.token1.symbol}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-2 h-2 rounded-full ${status.color}`} />
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <StatusIcon className="w-3 h-3" />
              {status.text}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Display */}
        <div className="p-4 rounded-lg bg-secondary/50">
          <div className="text-sm text-muted-foreground mb-1">Current Price</div>
          <div className="text-2xl font-display truncate">
            {isLoading ? '...' : formatPrice(latestValue)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Last update: {formatTimeAgo(lastUpdateTimestamp)}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Updates</div>
            <div className="font-semibold">{updateCount}</div>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Feed ID</div>
            <div className="font-mono text-xs truncate" title={feedId}>
              {feedId ? `${feedId.slice(0, 16)}...` : '—'}
            </div>
          </div>
        </div>

        {/* Update Button */}
        <Button 
          className="w-full bg-brand-500 hover:bg-brand-600"
          onClick={onUpdateClick}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Update Feed
            </>
          )}
        </Button>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(feed.customFeedAddress, 'Feed address')}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <a
            href={getExplorerUrl(chainId, 'address', feed.customFeedAddress)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-4 h-4 mr-1" />
              Explorer
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// Integration code snippets
function IntegrationSnippets({ feedAddress }: { feedAddress: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const solidityCode = `// Solidity - Read price in your smart contract
interface ICustomFeed {
    function getCurrentFeed() external view returns (
        uint256 value,
        int8 decimals,
        uint64 timestamp
    );
}

ICustomFeed feed = ICustomFeed(${feedAddress});
(uint256 price, int8 decimals, uint64 timestamp) = feed.getCurrentFeed();`;

  const jsCode = `// JavaScript/TypeScript - Read with viem
import { createPublicClient, http } from 'viem';
import { flare } from 'viem/chains';

const client = createPublicClient({ chain: flare, transport: http() });

const price = await client.readContract({
  address: '${feedAddress}',
  abi: [{ name: 'latestValue', type: 'function', inputs: [], outputs: [{ type: 'uint256' }] }],
  functionName: 'latestValue',
});

console.log('Price:', Number(price) / 1e6); // 6 decimals`;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Integrate in your app:</p>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Solidity</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => copyCode(solidityCode, 'solidity')}
          >
            {copied === 'solidity' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied === 'solidity' ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <pre className="p-2 rounded bg-black/50 text-xs overflow-x-auto max-h-24 text-green-400">
          <code>{solidityCode}</code>
        </pre>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">JavaScript</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => copyCode(jsCode, 'js')}
          >
            {copied === 'js' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied === 'js' ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <pre className="p-2 rounded bg-black/50 text-xs overflow-x-auto max-h-24 text-green-400">
          <code>{jsCode}</code>
        </pre>
      </div>
    </div>
  );
}

// Update Progress Modal
function UpdateProgressModal({
  isOpen,
  progress,
  onCancel,
  feedAddress,
}: {
  isOpen: boolean;
  progress: { step: UpdateStep; message: string; elapsed?: number; error?: string; txHash?: string };
  onCancel: () => void;
  feedAddress?: string;
}) {
  if (!isOpen) return null;

  const progressValue = STEP_PROGRESS[progress.step];
  const isError = progress.step === 'error';
  const isSuccess = progress.step === 'success';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full ${isSuccess ? 'max-w-2xl' : 'max-w-md'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : isError ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              )}
              {isSuccess ? 'Feed Updated!' : isError ? 'Update Failed' : 'Updating Feed'}
            </CardTitle>
            {!isSuccess && !isError && (
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isError && !isSuccess && (
            <Progress value={progressValue} className="h-2" />
          )}
          
          <p className={`text-sm ${isError ? 'text-red-400' : 'text-muted-foreground'}`}>
            {progress.message}
          </p>

          {progress.elapsed !== undefined && !isSuccess && !isError && (
            <p className="text-xs text-muted-foreground">
              Elapsed: {progress.elapsed}s
            </p>
          )}

          {progress.step === 'waiting-finalization' && (
            <div className="p-3 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
              <p className="font-medium mb-1">⏱️ FDC Finalization</p>
              <p>This typically takes 2-5 minutes. The transaction is being verified by Flare&apos;s decentralized attestation network.</p>
            </div>
          )}

          {isSuccess && feedAddress && (
            <div className="border-t pt-4 mt-4">
              <IntegrationSnippets feedAddress={feedAddress} />
            </div>
          )}

          {(isSuccess || isError) && (
            <Button 
              className="w-full" 
              onClick={onCancel}
              variant={isError ? 'destructive' : 'default'}
            >
              {isError ? 'Close' : 'Done'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MonitorPage() {
  const { feeds, recorders, isLoading, refresh } = useFeeds();
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { updateFeed, progress, isUpdating, cancel } = useFeedUpdater();
  
  const [updatingFeedId, setUpdatingFeedId] = useState<string | null>(null);

  const networkId: NetworkId = chainId === 14 ? 'flare' : 'coston2';
  const networkFeeds = feeds.filter(f => f.network === networkId);
  const networkRecorders = recorders.filter(r => r.network === networkId);

  const handleUpdateFeed = async (feed: StoredFeed) => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    // Find the recorder for this feed
    const recorder = networkRecorders.find(r => r.address === feed.priceRecorderAddress);
    if (!recorder) {
      toast.error('Price recorder not found');
      return;
    }

    setUpdatingFeedId(feed.id);

    try {
      await updateFeed(
        feed.priceRecorderAddress,
        feed.poolAddress,
        feed.customFeedAddress
      );
      
      // Refresh feeds data after successful update
      if (progress.step === 'success') {
        refresh();
      }
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleCloseModal = () => {
    if (isUpdating) {
      cancel();
    }
    setUpdatingFeedId(null);
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Monitor" 
        description="View your deployed custom feeds"
      />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {networkFeeds.length} Feed{networkFeeds.length !== 1 ? 's' : ''} on {networkId === 'flare' ? 'Mainnet' : 'Coston2'}
            </h2>
          </div>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Feeds Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading feeds...
          </div>
        ) : networkFeeds.length > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {networkFeeds.map((feed) => (
              <FeedCard 
                key={feed.id} 
                feed={feed} 
                chainId={chainId}
                onUpdateClick={() => handleUpdateFeed(feed)}
                isUpdating={isUpdating && updatingFeedId === feed.id}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No feeds yet</h3>
              <p className="text-muted-foreground mb-6">
                Deploy your first custom feed to start monitoring prices.
              </p>
              <Link href="/dashboard/deploy">
                <Button className="bg-brand-500 hover:bg-brand-600">
                  Deploy Feed
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Update Progress Modal */}
      <UpdateProgressModal
        isOpen={updatingFeedId !== null}
        progress={progress}
        onCancel={handleCloseModal}
        feedAddress={networkFeeds.find(f => f.id === updatingFeedId)?.customFeedAddress}
      />
    </div>
  );
}
