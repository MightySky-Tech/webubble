"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SellerProfile {
  id: number;
  user_id: number;
  seller_type: "informal" | "registered_business";
  trading_name: string;
  phone: string;
  status: "draft" | "pending" | "approved" | "rejected" | "needs_more_info";
  cac_number?: string;
  cac_verified?: boolean;
  created_at: string;
  updated_at: string;
  review_notes?: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customer_email: string;
  customer_phone: string;
  items: OrderItem[];
  status: "pending" | "confirmed" | "shipped" | "delivered" | "refunded";
  fulfillment_status: "pending" | "ready_for_pickup" | "picked_up" | "in_transit" | "delivered";
  total: number;
  created_at: string;
  updated_at: string;
}

export default function SellerDashboard() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "analytics">("overview");
  const [filterStatus, setFilterStatus] = useState<"all" | Order["status"]>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchSellerProfile();
    loadOrders();
  }, []);

  const loadOrders = () => {
    try {
      const savedOrders = localStorage.getItem("seller_orders");
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }
    } catch (err) {
      console.error("Error loading orders:", err);
    }
  };

  const fetchSellerProfile = async () => {
    try {
      const response = await fetch("/api/seller/me");

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load seller profile");
      }

      const data = await response.json();
      setSeller(data.data?.seller || null);
    } catch (err) {
      console.error("Error fetching seller profile:", err);
      setError("Failed to load seller dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="wb-seller-dashboard">
        <div className="wb-loading">Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wb-seller-dashboard">
        <div className="wb-error">{error}</div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="wb-seller-dashboard">
        <div className="wb-empty-state">
          <p>No seller profile found. <Link href="/seller/onboarding">Start onboarding</Link></p>
        </div>
      </div>
    );
  }

  const getStatusInfo = () => {
    switch (seller.status) {
      case 'pending':
        return {
          icon: '⏳',
          title: 'Onboarding In Progress',
          description: 'Your application is being reviewed by our team. We\'ll notify you as soon as it\'s approved.',
          color: 'warning',
          actions: [],
        };
      case 'approved':
        return {
          icon: '✅',
          title: 'Approved!',
          description: 'Congratulations! Your seller account is approved. You can now start listing products.',
          color: 'success',
          actions: [
            { label: 'Upload First Product', href: '/seller/products/new', primary: true },
            { label: 'View Products', href: '/seller/products' },
          ],
        };
      case 'rejected':
        return {
          icon: '❌',
          title: 'Application Not Approved',
          description: seller.review_notes || 'Your application does not meet our requirements.',
          color: 'error',
          actions: [
            { label: 'Try Again', href: '/seller/onboarding', primary: true },
          ],
        };
      case 'needs_more_info':
        return {
          icon: '🔍',
          title: 'More Information Needed',
          description: 'We need additional information to complete your verification.',
          color: 'warning',
          actions: [
            { label: 'Update Application', href: '/seller/onboarding', primary: true },
          ],
        };
      case 'draft':
      default:
        return {
          icon: '📝',
          title: 'Incomplete Onboarding',
          description: 'Complete your seller onboarding to start selling.',
          color: 'warning',
          actions: [
            { label: 'Continue Onboarding', href: '/seller/onboarding', primary: true },
          ],
        };
    }
  };

  const statusInfo = getStatusInfo();
  const isApproved = seller.status === 'approved';
  const isInformal = seller.seller_type === 'informal';

  return (
    <div className="wb-seller-dashboard">
      {/* Header */}
      <div className="wb-dashboard-header">
        <h1>Seller Dashboard</h1>
        <p className="wb-subtitle">Manage your {isInformal ? 'informal' : 'registered'} business on Webubble</p>
      </div>

      {/* Status Card */}
      <div className={`wb-status-card wb-status-${statusInfo.color}`}>
        <div className="wb-status-icon">{statusInfo.icon}</div>
        <div className="wb-status-content">
          <h2>{statusInfo.title}</h2>
          <p>{statusInfo.description}</p>
          {seller.review_notes && statusInfo.color === 'error' && (
            <div className="wb-rejection-reason">
              <strong>Reason:</strong> {seller.review_notes}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {statusInfo.actions.length > 0 && (
        <div className="wb-action-buttons">
          {statusInfo.actions.map((action, idx) => (
            <Link
              key={idx}
              href={action.href}
              className={`wb-btn ${action.primary ? 'wb-btn-primary' : 'wb-btn-secondary'}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}

      {/* Seller Info Card */}
      <div className="wb-info-section">
        <h3>Your Business Information</h3>
        <div className="wb-info-card">
          <div className="wb-info-row">
            <label>Business Name</label>
            <span className="wb-value">{seller.trading_name}</span>
          </div>
          <div className="wb-info-row">
            <label>Type</label>
            <span className="wb-value">{isInformal ? '🏪 Informal Seller' : '📋 Registered Business'}</span>
          </div>
          <div className="wb-info-row">
            <label>Contact Phone</label>
            <span className="wb-value">{seller.phone}</span>
          </div>
          <div className="wb-info-row">
            <label>Status</label>
            <span className="wb-value">
              <span className={`wb-badge wb-badge-${statusInfo.color}`}>
                {seller.status}
              </span>
            </span>
          </div>
          <div className="wb-info-row">
            <label>Application Date</label>
            <span className="wb-value">{new Date(seller.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="wb-quick-links">
        <h3>Quick Links</h3>
        <div className="wb-links-grid">
          <Link href="/seller/products" className="wb-link-card">
            <span className="wb-link-icon">📦</span>
            <span className="wb-link-label">My Products</span>
          </Link>
          <Link href="/seller/orders" className="wb-link-card">
            <span className="wb-link-icon">📋</span>
            <span className="wb-link-label">My Orders</span>
          </Link>
          <Link href="/seller/analytics" className="wb-link-card">
            <span className="wb-link-icon">📊</span>
            <span className="wb-link-label">Analytics</span>
          </Link>
          <Link href="/seller/settings" className="wb-link-card">
            <span className="wb-link-icon">⚙️</span>
            <span className="wb-link-label">Settings</span>
          </Link>
        </div>
      </div>

      {/* Help Section */}
      <div className="wb-help-section">
        <h3>Need Help?</h3>
        <p>
          {isApproved
            ? 'Check out our seller guide to learn how to upload products, manage inventory, and grow your business.'
            : 'Your seller application is being reviewed. If you have questions, please contact our support team.'}
        </p>
        <Link href="/help" className="wb-link-help">
          Visit Help Center →
        </Link>
      </div>
    </div>
  );
}
