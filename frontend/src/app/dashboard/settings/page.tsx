'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFeeds } from '@/context/feeds-context';
import { useChainId } from 'wagmi';
import { toast } from 'sonner';
import { 
  Copy, 
  Download, 
  Settings,
  Terminal,
  FileCode,
  AlertCircle
} from 'lucide-react';
import type { NetworkId, StoredFeed, StoredRecorder } from '@/lib/types';

function generateBotEnvConfig(
  feeds: StoredFeed[],
  recorder: StoredRecorder | null,
  network: NetworkId,
  privateKeyPlaceholder: boolean = true
): string {
  const lines: string[] = [
    '# ================================================',
    '# Flare Custom Feeds Bot Configuration',
    '# Network: Flare Mainnet',
    `# Generated: ${new Date().toISOString()}`,
    '# ================================================',
    '',
    '# Deployer wallet (KEEP SECRET - DO NOT COMMIT)',
    privateKeyPlaceholder 
      ? 'DEPLOYER_PRIVATE_KEY=0x_YOUR_PRIVATE_KEY_HERE'
      : '# DEPLOYER_PRIVATE_KEY already set',
    '',
    '# Network RPC',
    'FLARE_RPC_URL=https://flare-api.flare.network/ext/bc/C/rpc',
    '',
  ];
  
  if (recorder) {
    lines.push('# Price Recorder Contract');
    lines.push(`PRICE_RECORDER_ADDRESS=${recorder.address}`);
    lines.push('');
  }
  
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
  
  lines.push('# Bot Settings (optional)');
  lines.push('BOT_CHECK_INTERVAL_SECONDS=60');
  lines.push('BOT_LOG_LEVEL=compact');
  lines.push('BOT_LOG_FILE_ENABLED=true');
  
  return lines.join('\n');
}

function downloadEnvFile(content: string, filename: string = 'bot.env'): void {
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

export default function SettingsPage() {
  const { feeds, recorders } = useFeeds();
  const chainId = useChainId();

  const networkId: NetworkId = 'flare';
  const networkFeeds = feeds.filter(f => f.network === networkId);
  const networkRecorders = recorders.filter(r => r.network === networkId);

  const [selectedFeeds, setSelectedFeeds] = useState<Set<string>>(new Set());

  const toggleFeed = (feedId: string) => {
    setSelectedFeeds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feedId)) {
        newSet.delete(feedId);
      } else {
        newSet.add(feedId);
      }
      return newSet;
    });
  };

  const selectAllFeeds = () => {
    setSelectedFeeds(new Set(networkFeeds.map(f => f.id)));
  };

  const clearSelection = () => {
    setSelectedFeeds(new Set());
  };

  const selectedFeedsArray = useMemo(() => 
    networkFeeds.filter(f => selectedFeeds.has(f.id)),
    [networkFeeds, selectedFeeds]
  );

  const generatedConfig = useMemo(() => {
    const recorder = networkRecorders[0] || null;
    return generateBotEnvConfig(selectedFeedsArray, recorder, networkId);
  }, [selectedFeedsArray, networkRecorders, networkId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedConfig);
    toast.success('Configuration copied to clipboard');
  };

  const handleDownload = () => {
    downloadEnvFile(generatedConfig, `bot-${networkId}.env`);
    toast.success('Configuration file downloaded');
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Settings" 
        description="Configure bot settings and export configurations"
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Tabs defaultValue="bot-config" className="space-y-6">
          <TabsList>
            <TabsTrigger value="bot-config">
              <Terminal className="w-4 h-4 mr-2" />
              Bot Configuration
            </TabsTrigger>
            <TabsTrigger value="about">
              <Settings className="w-4 h-4 mr-2" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bot-config" className="space-y-6">
            {/* Export Bot Config */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-brand-500" />
                  Export Bot Configuration
                </CardTitle>
                <CardDescription>
                  Generate environment variables for running the price update bot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Feed Selection */}
                {networkFeeds.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Select feeds to include</Label>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={selectAllFeeds}>
                          Select All
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearSelection}>
                          Clear
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      {networkFeeds.map((feed) => (
                        <div
                          key={feed.id}
                          className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                        >
                          <Checkbox
                            id={feed.id}
                            checked={selectedFeeds.has(feed.id)}
                            onCheckedChange={() => toggleFeed(feed.id)}
                          />
                          <Label
                            htmlFor={feed.id}
                            className="flex-1 cursor-pointer font-normal"
                          >
                            <span className="font-semibold">{feed.alias}</span>
                            <span className="text-muted-foreground ml-2">
                              ({feed.token0.symbol}/{feed.token1.symbol})
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No feeds deployed on Mainnet yet.</p>
                  </div>
                )}

                {/* Config Preview */}
                <div className="space-y-2">
                  <Label>Generated Configuration</Label>
                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-black text-green-400 text-sm font-mono overflow-x-auto max-h-80">
                      {generatedConfig}
                    </pre>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button onClick={copyToClipboard} className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </Button>
                  <Button variant="outline" onClick={handleDownload} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download .env
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bot Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Running the Bot</CardTitle>
                <CardDescription>
                  Instructions for running the price update bot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li>
                    Copy the generated configuration above to your <code className="px-1 py-0.5 rounded bg-secondary">.env</code> file in the project root
                  </li>
                  <li>
                    Add your wallet private key to the <code className="px-1 py-0.5 rounded bg-secondary">DEPLOYER_PRIVATE_KEY</code> field
                  </li>
                  <li>
                    Ensure your wallet has sufficient FLR for gas and FDC attestation fees (~1.01 FLR per update)
                  </li>
                  <li>
                    Start the bot with:
                    <pre className="mt-2 p-3 rounded-lg bg-black text-green-400 font-mono text-sm">
                      npm run bot:start
                    </pre>
                  </li>
                </ol>

                <div className="p-4 rounded-lg bg-brand-500/10 border border-brand-500/20">
                  <h4 className="font-semibold text-brand-500 mb-2">💡 Tip</h4>
                  <p className="text-sm text-muted-foreground">
                    The bot will automatically record prices, request FDC attestations, and submit proofs to update your custom feeds.
                    Monitor the console output for status updates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About Flare Custom Feeds</CardTitle>
                <CardDescription>
                  An open-source toolkit for creating FDC-verified price feeds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">What are Custom Feeds?</h4>
                  <p className="text-sm text-muted-foreground">
                    Custom feeds allow you to create your own price feeds from Uniswap V3 pools on Flare Network.
                    Each price update is cryptographically attested through the Flare Data Connector (FDC),
                    ensuring trustworthy and verifiable price data.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">How It Works</h4>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Deploy a PriceRecorder contract to capture pool prices</li>
                    <li>Deploy a CustomFeed contract for each pool you want to track</li>
                    <li>Run the bot to record prices and submit FDC attestations</li>
                    <li>Your custom feed updates automatically with verified prices</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Cost per Update</h4>
                  <div className="text-sm text-muted-foreground">
                    <p>~0.002 FLR (record price gas)</p>
                    <p>~1.0 FLR (FDC attestation fee)</p>
                    <p>~0.004 FLR (submit proof gas)</p>
                    <p className="font-semibold mt-1">Total: ~1.01 FLR per update</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Built by{' '}
                    <a href="https://flareforward.com" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                      Flare Forward
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

