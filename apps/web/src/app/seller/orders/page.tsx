'use client';

import Link from 'next/link';

export default function SellerOrdersPage() {
  return (
    <div className="wb-seller-dashboard">
      <div className="wb-dashboard-header">
        <h1>My Orders</h1>
        <p className="wb-subtitle">Track and manage your orders</p>
      </div>

      <div className="wb-empty-state">
        <p>
          You don't have any orders yet.
          <br />
          Once customers start buying your products, they will appear here.
        </p>
      </div>
    </div>
  );
}
