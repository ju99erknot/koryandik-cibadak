import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // Verify authenticated session
    const cookieStore = await cookies();
    const session = verifySession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const subscription = await request.json();
    
    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    // TODO: Store subscription in database (Supabase)
    // For now, log and return success
    console.log('Push subscription received from', session.role, ':', subscription.endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}
