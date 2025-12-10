'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { FeedsData, StoredFeed, StoredRecorder, NetworkId } from '@/lib/types';

interface FeedsContextType {
  feeds: StoredFeed[];
  recorders: StoredRecorder[];
  isLoading: boolean;
  error: Error | null;
  addFeed: (feed: StoredFeed) => Promise<void>;
  removeFeed: (id: string) => Promise<void>;
  addRecorder: (recorder: StoredRecorder) => Promise<void>;
  removeRecorder: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  getFeedsByNetwork: (network: NetworkId) => StoredFeed[];
  getRecordersByNetwork: (network: NetworkId) => StoredRecorder[];
}

const FeedsContext = createContext<FeedsContextType | null>(null);

export function FeedsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FeedsData>({ version: '1.0.0', feeds: [], recorders: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/feeds');
      if (!res.ok) throw new Error('Failed to fetch feeds');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addFeed = async (feed: StoredFeed) => {
    const res = await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'feed', ...feed }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add feed');
    }
    await refresh();
  };

  const removeFeed = async (id: string) => {
    const res = await fetch(`/api/feeds?id=${id}&type=feed`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove feed');
    await refresh();
  };

  const addRecorder = async (recorder: StoredRecorder) => {
    const res = await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'recorder', ...recorder }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add recorder');
    }
    await refresh();
  };

  const removeRecorder = async (id: string) => {
    const res = await fetch(`/api/feeds?id=${id}&type=recorder`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove recorder');
    await refresh();
  };

  const getFeedsByNetwork = (network: NetworkId) => {
    return data.feeds.filter(f => f.network === network);
  };

  const getRecordersByNetwork = (network: NetworkId) => {
    return data.recorders.filter(r => r.network === network);
  };

  return (
    <FeedsContext.Provider
      value={{
        feeds: data.feeds,
        recorders: data.recorders,
        isLoading,
        error,
        addFeed,
        removeFeed,
        addRecorder,
        removeRecorder,
        refresh,
        getFeedsByNetwork,
        getRecordersByNetwork,
      }}
    >
      {children}
    </FeedsContext.Provider>
  );
}

export function useFeeds() {
  const ctx = useContext(FeedsContext);
  if (!ctx) {
    throw new Error('useFeeds must be used within FeedsProvider');
  }
  return ctx;
}

