import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { FeedsData, StoredFeed, StoredRecorder } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

// Check storage mode
const USE_DATABASE = process.env.NEXT_PUBLIC_USE_DATABASE === 'true';

// Supabase client (only created if database mode is enabled)
const supabase = USE_DATABASE && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  : null;

// ============ LOCAL JSON STORAGE ============
const DATA_PATH = join(process.cwd(), 'data', 'feeds.json');

function getDefaultData(): FeedsData {
  return { version: '1.0.0', feeds: [], recorders: [] };
}

function readLocalData(): FeedsData {
  try {
    if (!existsSync(DATA_PATH)) {
      return getDefaultData();
    }
    const content = readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(content) as FeedsData;
  } catch {
    return getDefaultData();
  }
}

function writeLocalData(data: FeedsData): void {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// ============ SUPABASE STORAGE ============
async function readSupabaseData(): Promise<FeedsData> {
  if (!supabase) return getDefaultData();
  
  try {
    const [feedsResult, recordersResult] = await Promise.all([
      supabase.from('feeds').select('*'),
      supabase.from('recorders').select('*'),
    ]);

    // Transform database format to app format
    const feeds: StoredFeed[] = (feedsResult.data || []).map((f) => ({
      id: f.id,
      alias: f.alias,
      network: f.network as 'flare' | 'coston2',
      poolAddress: f.pool_address as `0x${string}`,
      customFeedAddress: f.custom_feed_address as `0x${string}`,
      priceRecorderAddress: f.price_recorder_address as `0x${string}`,
      token0Decimals: f.token0_decimals,
      token1Decimals: f.token1_decimals,
      invertPrice: f.invert_price,
      deployedAt: f.deployed_at,
      deployedBy: f.deployed_by as `0x${string}`,
    }));

    const recorders: StoredRecorder[] = (recordersResult.data || []).map((r) => ({
      id: r.id,
      address: r.address as `0x${string}`,
      network: r.network as 'flare' | 'coston2',
      updateInterval: r.update_interval,
      deployedAt: r.deployed_at,
      deployedBy: r.deployed_by as `0x${string}`,
    }));

    return { version: '1.0.0', feeds, recorders };
  } catch (error) {
    console.error('Error reading from Supabase:', error);
    return getDefaultData();
  }
}

async function addSupabaseFeed(feed: StoredFeed): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Database not configured' };

  try {
    const { error } = await supabase.from('feeds').insert({
      id: feed.id,
      alias: feed.alias,
      network: feed.network,
      pool_address: feed.poolAddress,
      custom_feed_address: feed.customFeedAddress,
      price_recorder_address: feed.priceRecorderAddress,
      token0_decimals: feed.token0Decimals,
      token1_decimals: feed.token1Decimals,
      invert_price: feed.invertPrice,
      deployed_at: feed.deployedAt,
      deployed_by: feed.deployedBy,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Error adding feed to Supabase:', error);
    return { success: false, error: 'Failed to save feed' };
  }
}

async function addSupabaseRecorder(recorder: StoredRecorder): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Database not configured' };

  try {
    const { error } = await supabase.from('recorders').insert({
      id: recorder.id,
      address: recorder.address,
      network: recorder.network,
      update_interval: recorder.updateInterval,
      deployed_at: recorder.deployedAt,
      deployed_by: recorder.deployedBy,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Error adding recorder to Supabase:', error);
    return { success: false, error: 'Failed to save recorder' };
  }
}

async function deleteFromSupabase(id: string, type: 'feed' | 'recorder'): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Database not configured' };

  try {
    const table = type === 'recorder' ? 'recorders' : 'feeds';
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
    return { success: false, error: 'Failed to delete' };
  }
}

// ============ API HANDLERS ============

// GET - Read all feeds and recorders
export async function GET() {
  try {
    if (USE_DATABASE) {
      const data = await readSupabaseData();
      return NextResponse.json(data);
    } else {
      const data = readLocalData();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error reading feeds:', error);
    return NextResponse.json(getDefaultData());
  }
}

// POST - Add new feed or recorder
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ...item } = body;

    if (USE_DATABASE) {
      // Database mode
      if (type === 'recorder') {
        const result = await addSupabaseRecorder(item as StoredRecorder);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
      } else {
        const result = await addSupabaseFeed(item as StoredFeed);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
      }
      const data = await readSupabaseData();
      return NextResponse.json({ success: true, data });
    } else {
      // Local JSON mode
      const data = readLocalData();

      if (type === 'recorder') {
        const recorder = item as StoredRecorder;
        const exists = data.recorders.some(r => 
          r.address.toLowerCase() === recorder.address.toLowerCase() && 
          r.network === recorder.network
        );
        if (exists) {
          return NextResponse.json(
            { error: 'Recorder already exists' },
            { status: 400 }
          );
        }
        data.recorders.push(recorder);
      } else {
        const feed = item as StoredFeed;
        const exists = data.feeds.some(f => 
          f.customFeedAddress.toLowerCase() === feed.customFeedAddress.toLowerCase() && 
          f.network === feed.network
        );
        if (exists) {
          return NextResponse.json(
            { error: 'Feed already exists' },
            { status: 400 }
          );
        }
        data.feeds.push(feed);
      }

      writeLocalData(data);
      return NextResponse.json({ success: true, data });
    }
  } catch (error) {
    console.error('Error saving data:', error);
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    );
  }
}

// DELETE - Remove feed or recorder by ID
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = (searchParams.get('type') || 'feed') as 'feed' | 'recorder';

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    if (USE_DATABASE) {
      const result = await deleteFromSupabase(id, type);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    } else {
      const data = readLocalData();

      if (type === 'recorder') {
        data.recorders = data.recorders.filter(r => r.id !== id);
      } else {
        data.feeds = data.feeds.filter(f => f.id !== id);
      }

      writeLocalData(data);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error deleting data:', error);
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    );
  }
}
