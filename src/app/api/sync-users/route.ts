import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { syncPlaceholderUsers } from '@/actions/supabase';

/**
 * API route to sync placeholder users with their real Clerk data
 * Only accessible by authenticated users
 * 
 * Usage: GET /api/sync-users
 */
export async function GET() {
  try {
    // Ensure user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run the sync
    const result = await syncPlaceholderUsers();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully synced ${result.synced} user(s)`,
        synced: result.synced,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in sync-users API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


