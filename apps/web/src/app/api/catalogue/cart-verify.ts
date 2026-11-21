import { NextRequest, NextResponse } from 'next/server';

interface CartVerifyRequest {
  product_ids: number[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CartVerifyRequest = await request.json();
    
    if (!body.product_ids || !Array.isArray(body.product_ids)) {
      return NextResponse.json(
        { error: 'Invalid product_ids' },
        { status: 400 }
      );
    }

    // Fetch product details from the API to verify prices and stock
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://webubble-api:8100';
    const productIds = body.product_ids.join(',');
    
    const response = await fetch(
      `${apiUrl}/api/v1/catalogue/products?ids=${productIds}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // If product verification fails, return error but don't crash
      return NextResponse.json(
        { error: 'Failed to verify products' },
        { status: response.status }
      );
    }

    const products = await response.json();
    
    return NextResponse.json({
      data: products.data || products,
    });
  } catch (error) {
    console.error('Cart verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify cart' },
      { status: 500 }
    );
  }
}
