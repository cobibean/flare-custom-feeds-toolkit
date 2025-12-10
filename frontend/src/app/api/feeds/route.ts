import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { FeedsData, StoredFeed, StoredRecorder } from '@/lib/types';

const DATA_PATH = join(process.cwd(), 'data', 'feeds.json');

function getDefaultData(): FeedsData {
  return { version: '1.0.0', feeds: [], recorders: [] };
}

function readData(): FeedsData {
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

function writeData(data: FeedsData): void {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// GET - Read all feeds and recorders
export async function GET() {
  try {
    const data = readData();
    return NextResponse.json(data);
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

    const data = readData();

    if (type === 'recorder') {
      const recorder = item as StoredRecorder;
      // Check for duplicates
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
      // Check for duplicates
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

    writeData(data);
    return NextResponse.json({ success: true, data });
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
    const type = searchParams.get('type') || 'feed';

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const data = readData();

    if (type === 'recorder') {
      data.recorders = data.recorders.filter(r => r.id !== id);
    } else {
      data.feeds = data.feeds.filter(f => f.id !== id);
    }

    writeData(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting data:', error);
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    );
  }
}

