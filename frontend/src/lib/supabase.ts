import { createClient } from '@supabase/supabase-js';

// Check if we should use the database (for hosted demo) or local JSON (for self-hosted)
export const USE_DATABASE = process.env.NEXT_PUBLIC_USE_DATABASE === 'true';

// Only create client if database mode is enabled
export const supabase = USE_DATABASE
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  : null;

// Database types matching the Supabase schema
export interface DbFeed {
  id: string;
  alias: string;
  network: string;
  pool_address: string;
  custom_feed_address: string;
  price_recorder_address: string;
  recorder_id: string | null;
  token0_decimals: number;
  token1_decimals: number;
  invert_price: boolean;
  deployed_at: string;
  deployed_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbRecorder {
  id: string;
  address: string;
  network: string;
  update_interval: number;
  deployed_at: string;
  deployed_by: string;
  created_at: string;
  updated_at: string;
}

