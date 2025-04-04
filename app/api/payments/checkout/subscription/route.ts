import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions';
import { dodopayments } from '@/lib/dodopayments';

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Creating subscription checkout for user: ${userId}, product: ${productId}`);
    
    // Create subscription in Dodo Payments
    const response = await dodopayments.subscriptions.create({
      billing: {
        city: "City",
        country: "US",
        state: "State",
        street: "Address",
        zipcode: "10001",
      },
      customer: {
        email: session.user.email || 'user@example.com',
        name: session.user.name || 'User',
      },
      payment_link: true,
      product_id: productId,
      quantity: 1,
      return_url: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL}/checkout-success?from=checkout-success`,
      metadata: {
        userId: userId,
      }
    });
    
    console.log('Checkout session created:', response.payment_link);
    
    return NextResponse.json({ 
      payment_link: response.payment_link,
      checkout_id: response.subscription_id 
    });
    
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 