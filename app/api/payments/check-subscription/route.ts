import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions';
import db from '../../../../prisma/db';

export async function GET() {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      console.log('No authenticated user found');
      return NextResponse.json({ hasAccess: false }, { status: 401 });
    }
    
    const userId = session.user.id;
    console.log(`Checking subscription status for user: ${userId}`);
    
    // Check for active subscription in database
    const subscription = await db.subscription.findUnique({
      where: { userId },
    });
    
    console.log('Subscription found:', subscription ? JSON.stringify(subscription) : 'none');
    
    const hasAccess = Boolean(subscription && subscription.status === 'active');
    console.log(`Access granted: ${hasAccess}`);
    
    return NextResponse.json({ 
      hasAccess,
      subscriptionStatus: subscription?.status || 'none'
    });
    
  } catch (error) {
    console.error('Error checking subscription status:', error);
    // For errors, we'll still return a response but with error details
    return NextResponse.json(
      { 
        hasAccess: false, 
        error: 'Failed to check subscription status'
      }, 
      { status: 500 }
    );
  }
} 