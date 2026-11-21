'use client';

import Link from 'next/link';

export default function SellerAnalyticsPage() {
  return (
    <div className="wb-seller-dashboard">
      <div className="wb-dashboard-header">
        <h1>Analytics</h1>
        <p className="wb-subtitle">Monitor your business performance</p>
      </div>

      <div className="wb-empty-state">
        <p>
          Analytics will appear once you start selling.
          <br />
          Monitor your sales, views, and customer engagement here.
        </p>
      </div>
    </div>
  );
}
