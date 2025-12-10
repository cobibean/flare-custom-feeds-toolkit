'use client';

import { useChainId, useSwitchChain } from 'wagmi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { flare, coston2 } from '@/lib/wagmi-config';

export function NetworkSwitcher() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const handleChange = (value: string) => {
    const newChainId = parseInt(value, 10);
    if (newChainId !== chainId) {
      switchChain({ chainId: newChainId });
    }
  };

  return (
    <Select
      value={chainId.toString()}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select network" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={flare.id.toString()}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Flare Mainnet
          </div>
        </SelectItem>
        <SelectItem value={coston2.id.toString()}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            Coston2 Testnet
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

