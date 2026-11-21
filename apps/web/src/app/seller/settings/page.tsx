'use client';

import Link from 'next/link';

export default function SellerSettingsPage() {
  return (
    <div className="wb-seller-dashboard">
      <div className="wb-dashboard-header">
        <h1>Settings</h1>
        <p className="wb-subtitle">Manage your seller account</p>
      </div>

      <div className="wb-empty-state">
        <p>
          Settings and preferences will be available soon.
          <br />
          You&apos;ll be able to update your business information, payment methods, and preferences here.
        </p>
      </div>
    </div>
  );
}
