'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SellerProfile {
  id: number;
  user_id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  seller_type: 'informal' | 'registered_business';
  trading_name: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  cac_number?: string;
  cac_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchSellers();
  }, [filter]);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/sellers?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setSellers(data.data || []);
      } else {
        console.error('Failed to fetch sellers');
      }
    } catch (error) {
      console.error('Error fetching sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (sellerId: number) => {
    setActionLoading(sellerId);
    try {
      const response = await fetch(`/api/admin/sellers/${sellerId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (response.ok) {
        setSellers(sellers.map(s => 
          s.id === sellerId ? { ...s, status: 'approved' } : s
        ));
      }
    } catch (error) {
      console.error('Error approving seller:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (sellerId: number) => {
    if (!confirm('Are you sure you want to reject this seller?')) return;
    
    setActionLoading(sellerId);
    try {
      const response = await fetch(`/api/admin/sellers/${sellerId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      if (response.ok) {
        setSellers(sellers.map(s => 
          s.id === sellerId ? { ...s, status: 'rejected' } : s
        ));
      }
    } catch (error) {
      console.error('Error rejecting seller:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'wb-badge wb-badge-success';
      case 'rejected':
        return 'wb-badge wb-badge-error';
      case 'pending':
      default:
        return 'wb-badge wb-badge-warning';
    }
  };

  const getSellerTypeLabel = (type: string) => {
    return type === 'informal' ? '🏪 Informal' : '📋 Registered';
  };

  return (
    <div className="wb-admin-sellers">
      <div className="wb-sellers-header">
        <h1>Seller Management</h1>
        <p className="wb-subtitle">Review and approve seller applications</p>
      </div>

      <div className="wb-sellers-filters">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
          <button
            key={status}
            className={`wb-filter-btn ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="wb-loading">Loading sellers...</div>
      ) : sellers.length === 0 ? (
        <div className="wb-empty-state">
          <p>No {filter !== 'all' ? filter + ' ' : ''}sellers found</p>
        </div>
      ) : (
        <div className="wb-sellers-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map(seller => (
                <tr key={seller.id} className="wb-seller-row">
                  <td className="wb-seller-name">
                    <strong>{seller.trading_name}</strong>
                    <small>{seller.user.name}</small>
                  </td>
                  <td>{seller.user.email}</td>
                  <td>{seller.phone}</td>
                  <td>{getSellerTypeLabel(seller.seller_type)}</td>
                  <td>
                    <span className={getStatusBadgeClass(seller.status)}>
                      {seller.status}
                    </span>
                  </td>
                  <td className="wb-date">
                    {new Date(seller.created_at).toLocaleDateString()}
                  </td>
                  <td className="wb-actions">
                    {seller.status === 'pending' && (
                      <>
                        <button
                          className="wb-btn wb-btn-approve"
                          onClick={() => handleApprove(seller.id)}
                          disabled={actionLoading === seller.id}
                        >
                          {actionLoading === seller.id ? '...' : '✓ Approve'}
                        </button>
                        <button
                          className="wb-btn wb-btn-reject"
                          onClick={() => handleReject(seller.id)}
                          disabled={actionLoading === seller.id}
                        >
                          {actionLoading === seller.id ? '...' : '✕ Reject'}
                        </button>
                      </>
                    )}
                    {seller.status !== 'pending' && (
                      <Link href={`/sellers/${seller.id}`} className="wb-btn wb-btn-view">
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
