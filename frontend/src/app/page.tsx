'use client';

import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Zap, Shield, Clock, Coins } from "lucide-react";

export default function LandingPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  // Redirect to dashboard if connected
  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-background to-background dark:from-brand-950/30 dark:via-background dark:to-background" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23E8195D' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative">
          {/* Navigation */}
          <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/logo.png"
                alt="Flare Forward"
                width={180}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </div>
            <ConnectButton showBalance={false} />
          </nav>

          {/* Hero Content */}
          <div className="px-6 py-24 md:py-32 max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Powered by Flare Data Connector
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display tracking-tight mb-6">
                Create Custom{" "}
                <span className="text-brand-500">Price Feeds</span>{" "}
                on Flare
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
                Deploy FDC-verified price feeds from any Uniswap V3 pool. 
                Full sovereignty over your data with on-chain attestation.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <ConnectButton.Custom>
                  {({ openConnectModal, mounted }) => {
                    const ready = mounted;
                    return (
                      <Button
                        size="lg"
                        onClick={openConnectModal}
                        disabled={!ready}
                        className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-6 text-lg"
                      >
                        Connect Wallet
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    );
                  }}
                </ConnectButton.Custom>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-6 text-lg"
                  asChild
                >
                  <a
                    href="https://github.com/your-repo/flare-custom-feeds-toolkit"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <section className="px-6 py-24 bg-card">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display mb-4 text-center">
            How It Works
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            Four simple steps to deploy your own FDC-verified custom price feed
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Deploy Recorder",
                description: "Deploy a PriceRecorder contract to capture pool prices on-chain",
                icon: "📝",
              },
              {
                step: "02",
                title: "Enable Pool",
                description: "Whitelist your target Uniswap V3 pool for price recording",
                icon: "✅",
              },
              {
                step: "03",
                title: "Deploy Feed",
                description: "Create a CustomFeed contract that implements IICustomFeed",
                icon: "🚀",
              },
              {
                step: "04",
                title: "Run Bot",
                description: "Start the bot to record prices and submit FDC attestations",
                icon: "🤖",
              },
            ].map((item) => (
              <Card key={item.step} className="relative overflow-hidden group hover:border-brand-500/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <div className="text-brand-500 font-mono text-sm mb-2">{item.step}</div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </CardContent>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-brand-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display mb-4 text-center">
            Why Custom Feeds?
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            Full control over your price data with enterprise-grade security
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">FDC Verified</h3>
              <p className="text-muted-foreground text-sm">
                Every price update is cryptographically attested through Flare Data Connector
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Custom Intervals</h3>
              <p className="text-muted-foreground text-sm">
                Configure update frequency to match your protocol&apos;s needs
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">FTSO Compatible</h3>
              <p className="text-muted-foreground text-sm">
                Implements IICustomFeed for seamless integration with existing infrastructure
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Breakdown Section */}
      <section className="px-6 py-24 bg-card">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display mb-4 text-center">
            Cost Per Update
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Transparent pricing with real-time gas estimation in the dashboard
          </p>

          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-muted-foreground" />
                    <span>Record Price (gas)</span>
                  </div>
                  <span className="font-mono text-brand-500">~0.002 FLR</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <span>FDC Attestation (fee)</span>
                  </div>
                  <span className="font-mono text-brand-500">~1.0 FLR</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                    <span>Submit Proof (gas)</span>
                  </div>
                  <span className="font-mono text-brand-500">~0.004 FLR</span>
                </div>
                <div className="flex justify-between items-center py-3 font-semibold">
                  <span>Total per Update</span>
                  <span className="font-mono text-brand-500 text-lg">~1.01 FLR</span>
                </div>
              </CardContent>
            </Card>
            <p className="text-center text-muted-foreground text-sm mt-4">
              * Gas costs vary with network conditions
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-display mb-6">
            Ready to Deploy?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Connect your wallet to start deploying custom price feeds on Flare Network
          </p>
          <ConnectButton.Custom>
            {({ openConnectModal, mounted }) => {
              const ready = mounted;
              return (
                <Button
                  size="lg"
                  onClick={openConnectModal}
                  disabled={!ready}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-12 py-6 text-lg"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo.png"
              alt="Flare Forward"
              width={120}
              height={30}
              className="h-8 w-auto opacity-70"
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Open source toolkit for the Flare ecosystem
          </p>
        </div>
      </footer>
    </div>
  );
}
