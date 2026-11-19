import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

interface ShippingAddress {
  full_name: string;
  phone_number: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface CartItem {
  id: string;
  product_id: number;
  variant_id: number;
  variant_label: string;
  product_name: string;
  price_minor: number;
  quantity: number;
}

interface OrderRequest {
  cart_items: CartItem[];
  shipping_address: ShippingAddress;
  payment_method: string;
  payment_provider: string;
  total_amount_minor: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('webubble_access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body: OrderRequest = await request.json();

    // Validate request
    if (!body.cart_items || !Array.isArray(body.cart_items) || body.cart_items.length === 0) {
      return NextResponse.json(
        { message: 'Cart cannot be empty' },
        { status: 400 }
      );
    }

    if (!body.shipping_address) {
      return NextResponse.json(
        { message: 'Shipping address required' },
        { status: 400 }
      );
    }

    // Forward order creation to API
    const apiUrl = process.env.WEBUBBLE_API_URL ?? 'http://localhost:8100';

    const response = await fetch(
      `${apiUrl}/api/v1/orders`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: body.cart_items.map(item => ({
            product_variant_id: item.variant_id,
            quantity: item.quantity,
          })),
          shipping_address: body.shipping_address,
          payment_method: body.payment_method,
          payment_provider: body.payment_provider,
        }),
      }
    );

    if (response.status === 404) {
      // The API has no orders endpoint yet; don't expose its route message to buyers.
      return NextResponse.json(
        { message: 'Online ordering is not available yet. Please try again later.' },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        error,
        { status: response.status }
      );
    }

    const order = await response.json();

    return NextResponse.json({
      order: order.data || order,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { message: 'Failed to create order' },
      { status: 500 }
    );
  }
}
