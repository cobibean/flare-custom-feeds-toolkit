'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFeeds } from '@/context/feeds-context';
import { useChainId, useReadContracts } from 'wagmi';
import { CUSTOM_FEED_ABI } from '@/lib/contracts';
import { getExplorerUrl } from '@/lib/wagmi-config';
import { 
  Activity, 
  ExternalLink, 
  Copy, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { NetworkId, BotStatus } from '@/lib/types';

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

interface FeedCardProps {
  feed: {
    id: string;
    alias: string;
    customFeedAddress: `0x${string}`;
    poolAddress: `0x${string}`;
    token0: { symbol: string };
    token1: { symbol: string };
  };
  chainId: number;
}

function FeedCard({ feed, chainId }: FeedCardProps) {
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
    <Card className="hover:border-brand-500/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{feed.alias}</CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {feed.token0.symbol}/{feed.token1.symbol}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
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
          <div className="text-2xl font-display">
            {isLoading ? '...' : formatPrice(latestValue)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Last update: {formatTimeAgo(lastUpdateTimestamp)}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Updates</div>
            <div className="font-semibold">{updateCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Feed ID</div>
            <div className="font-mono text-xs truncate">{feedId || '—'}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(feed.customFeedAddress, 'Feed address')}
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
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

export default function MonitorPage() {
  const { feeds, isLoading, refresh } = useFeeds();
  const chainId = useChainId();

  const networkId: NetworkId = chainId === 14 ? 'flare' : 'coston2';
  const networkFeeds = feeds.filter(f => f.network === networkId);

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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {networkFeeds.map((feed) => (
              <FeedCard key={feed.id} feed={feed} chainId={chainId} />
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
    </div>
  );
}

