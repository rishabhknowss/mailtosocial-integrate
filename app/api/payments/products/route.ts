import { NextResponse } from 'next/server';
import { Product } from '@/app/types/types';

// This is a sample implementation. In a real application, you would
// fetch products from your database or from the Dodo Payments API
export async function GET() {
  try {
    // Sample products data
    const products: Product[] = [
      {
        product_id: "pdt_yr0qRoGoC4R61tDOcfzih",
        name: 'Basic Plan',
        description: 'Essential features for social media management',
        price: 1999, // $9.99
        is_recurring: true
      },
      {
        product_id: "pdt_Gwj6P6l1h",
        name: 'Premium Plan',
        description: 'Advanced features with unlimited posts',
        price: 1999, // $19.99
        is_recurring: true
      },
      {
        product_id: "pdt_Gwj6P61hl",
        name: 'Enterprise Plan',
        description: 'Complete solution for business needs with priority support',
        price: 4999, // $49.99
        is_recurring: true
      }
    ];

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
} 