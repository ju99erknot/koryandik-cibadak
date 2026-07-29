import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    
    // Validate subscription object
    if (!subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    // TODO: Remove subscription from database
    console.log('Push unsubscription received:', subscription.endpoint);

    // Example Supabase implementation (uncomment when ready):
    // const { error } = await supabase
    //   .from('push_subscriptions')
    //   .delete()
    //   .eq('endpoint', subscription.endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
