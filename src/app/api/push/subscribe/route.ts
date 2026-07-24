import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    
    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    // TODO: Store subscription in database (Supabase or localStorage fallback)
    // For now, we'll just log it and return success
    console.log('Push subscription received:', subscription.endpoint);

    // Example Supabase implementation (uncomment when ready):
    // const { data, error } = await supabase
    //   .from('push_subscriptions')
    //   .upsert({
    //     endpoint: subscription.endpoint,
    //     keys: subscription.keys,
    //     user_id: subscription.userId || null,
    //     created_at: new Date().toISOString()
    //   });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}
