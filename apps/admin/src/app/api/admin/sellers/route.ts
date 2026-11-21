import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';

    // Call Laravel API to fetch sellers
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100'}/api/v1/admin/sellers`;
    const params = new URLSearchParams();
    
    if (status !== 'all') {
      params.append('status', status);
    }

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${request.cookies.get('auth_token')?.value || ''}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sellers' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
