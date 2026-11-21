'use client';

import { useState, useEffect } from 'react';

interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: string[];
  expectedResult: string;
  status: 'pending' | 'pass' | 'fail';
  comments: string;
  testedBy?: string;
  testedAt?: string;
}

const INITIAL_TEST_CASES: TestCase[] = [
  {
    id: 'TC-001',
    name: 'Homepage Loads',
    description: 'Verify homepage renders with products and categories',
    steps: [
      'Navigate to homepage',
      'Wait for products to load',
      'Check if categories display'
    ],
    expectedResult: 'Homepage displays with hero section, product cards, and categories visible',
    status: 'pending',
    comments: ''
  },
  {
    id: 'TC-002',
    name: 'Add Product to Cart',
    description: 'Test adding a single product to shopping cart',
    steps: [
      'Browse to any product',
      'Click "Add to Cart" button',
      'Navigate to /cart',
      'Verify product appears in cart'
    ],
    expectedResult: 'Product appears in cart with correct name, price, and quantity selector',
    status: 'pending',
    comments: ''
  },
  {
    id: 'TC-003',
    name: 'Cart Quantity Adjustment',
    description: 'Test increasing and decreasing product quantity in cart',
    steps: [
      'Add product to cart',
      'Go to cart page',
      'Click + button to increase quantity',
      'Click - button to decrease quantity'
    ],
    expectedResult: 'Quantity updates correctly, cart total recalculates in real-time',
    status: 'pending',
    comments: ''
  },
  {
    id: 'TC-004',
    name: 'Remove Item from Cart',
    description: 'Test removing an item from the shopping cart',
    steps: [
      'Add multiple products to cart',
      'Navigate to cart page',
      'Click remove button on one item',
      'Verify item is removed'
    ],
    expectedResult: 'Item is removed from cart, totals recalculate, empty state shows if no items left',
    status: 'pending',
    comments: ''
  },
  {
    id: 'TC-005',
    name: 'Cart Persistence',
    description: 'Test that cart items persist after page refresh',
    steps: [
      'Add products to cart',
      'Refresh the page (F5)',
      'Check cart contents'
    ],
    expectedResult: 'Cart items and quantities remain after refresh (localStorage persistence)',
    status: 'pending',
    comments: ''
  },
  {
    id: 'TC-006',
    name: 'Checkout Step 1 - Shipping Address',
    description: 'Test shipping address form in checkout step 1',
    steps: [
      'Add products to cart',
      'Navigate to /checkout',
      'Fill in shipping address form (name, phone, address, city, state)',
      'Click Next/Continue'
    ],
    expectedResult: 'Form validates input, shows errors for invalid phone, advances to payment step',
    status: 'pending',
    comments: ''
  },
  {
    id: 'TC-007',
    name: 'Checkout Step 2 - Payment Selection',
    description: 'Test payment method selection in checkout step 2',
    steps: [
      'Complete shipping address step',
      'See payment method options (Card, Bank Transfer, Mobile Money)',
      'Select payment provider (Paystack, Flutterwave)',
      'Click Next'
    ],
    expectedResult: 'Payment method and provider selections work, data persists when moving between steps',
    status: 'pending',
    comments: ''
  },
  {
    id: 'TC-008',
    name: 'Checkout Step 3 - Review Order',
    description: 'Test order review before final submission',
    steps: [
      'Complete shipping and payment steps',
      'Review order summary with items, totals, shipping address',
      'Verify edit buttons work to go back and change details'
    ],
    expectedResult: 'Order summary displays correctly with all details, edit buttons navigate to previous steps',
    status: 'pending',
    comments: ''
  },
  {
    id: 'TC-009',
    name: 'Checkout Step 4 - Order Confirmation',
    description: 'Test order placement and confirmation',
    steps: [
      'Complete all 3 checkout steps',
      'Click "Place Order" button',
      'Wait for confirmation'
    ],
    expectedResult: 'Order is created, confirmation page displays order ID, success message shown',
    status: 'pending',
    comments: ''
  },
  {
    id: 'TC-010',
    name: 'Form Validation - Phone Number',
    description: 'Test phone number validation in shipping form',
    steps: [
      'Navigate to checkout',
      'Enter invalid phone number (less than 10 digits)',
      'Try to proceed'
    ],
    expectedResult: 'Error message appears, form prevents submission until valid phone is entered',
    status: 'pending',
    comments: ''
  },
  {
    id: 'TC-011',
    name: 'Mobile Responsiveness',
    description: 'Test layout on mobile devices (375px width)',
    steps: [
      'Open DevTools (F12)',
      'Set viewport to mobile (375px)',
      'Navigate through cart and checkout pages'
    ],
    expectedResult: 'Layout stacks vertically, all elements remain readable and clickable on mobile',
    status: 'pending',
    comments: ''
  },
  {
    id: 'TC-012',
    name: 'Empty Cart Message',
    description: 'Test empty cart state when no items present',
    steps: [
      'Navigate to /cart without adding items',
      'Or remove all items from cart'
    ],
    expectedResult: 'Empty cart message displays with helpful text, "Continue Shopping" link shown',
    status: 'pending',
    comments: ''
  }
];

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState<TestCase[]>(INITIAL_TEST_CASES);
  const [filter, setFilter] = useState<'all' | 'pending' | 'pass' | 'fail'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('webubble_test_cases');
    if (saved) {
      try {
        setTestCases(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load test cases:', e);
      }
    }
  }, []);

  // Save to localStorage whenever test cases change
  useEffect(() => {
    localStorage.setItem('webubble_test_cases', JSON.stringify(testCases));
  }, [testCases]);

  const updateTestCase = (id: string, updates: Partial<TestCase>) => {
    setTestCases(testCases.map(tc =>
      tc.id === id ? { ...tc, ...updates } : tc
    ));
  };

  const filteredCases = testCases.filter(tc => {
    if (filter === 'all') return true;
    return tc.status === filter;
  });

  const stats = {
    total: testCases.length,
    pass: testCases.filter(tc => tc.status === 'pass').length,
    fail: testCases.filter(tc => tc.status === 'fail').length,
    pending: testCases.filter(tc => tc.status === 'pending').length
  };

  const passPercentage = stats.total > 0 ? Math.round((stats.pass / stats.total) * 100) : 0;

  return (
    <div className="wb-test-cases-page">
      <div className="wb-test-cases-header">
        <div className="wb-test-cases-title">
          <h1>🧪 Test Case Management</h1>
          <p>Test and validate Webubble features. Mark each test as Pass/Fail and add comments.</p>
        </div>

        {/* Stats Dashboard */}
        <div className="wb-test-stats">
          <div className="wb-stat-card wb-stat-total">
            <div className="wb-stat-value">{stats.total}</div>
            <div className="wb-stat-label">Total Tests</div>
          </div>
          <div className="wb-stat-card wb-stat-pass">
            <div className="wb-stat-value">{stats.pass}</div>
            <div className="wb-stat-label">Passed ✅</div>
          </div>
          <div className="wb-stat-card wb-stat-fail">
            <div className="wb-stat-value">{stats.fail}</div>
            <div className="wb-stat-label">Failed ❌</div>
          </div>
          <div className="wb-stat-card wb-stat-pending">
            <div className="wb-stat-value">{stats.pending}</div>
            <div className="wb-stat-label">Pending ⏳</div>
          </div>
          <div className="wb-stat-card wb-stat-progress">
            <div className="wb-stat-progress-bar">
              <div className="wb-stat-progress-fill" style={{ width: `${passPercentage}%` }}></div>
            </div>
            <div className="wb-stat-label">{passPercentage}% Passed</div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="wb-test-filter">
        {(['all', 'pending', 'pass', 'fail'] as const).map(f => (
          <button
            key={f}
            className={`wb-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' && '📋 All'}
            {f === 'pending' && '⏳ Pending'}
            {f === 'pass' && '✅ Passed'}
            {f === 'fail' && '❌ Failed'}
            {' '}
            <span className="wb-filter-count">
              ({f === 'all' ? stats.total : f === 'pending' ? stats.pending : f === 'pass' ? stats.pass : stats.fail})
            </span>
          </button>
        ))}
      </div>

      {/* Test Cases List */}
      <div className="wb-test-cases-list">
        {filteredCases.map(testCase => (
          <div key={testCase.id} className={`wb-test-case wb-status-${testCase.status}`}>
            <div className="wb-test-case-header" onClick={() => setExpandedId(expandedId === testCase.id ? null : testCase.id)}>
              <div className="wb-test-case-title-row">
                <div className="wb-test-id">{testCase.id}</div>
                <div className="wb-test-name">{testCase.name}</div>
                <div className={`wb-test-status-badge wb-badge-${testCase.status}`}>
                  {testCase.status === 'pass' && '✅ PASS'}
                  {testCase.status === 'fail' && '❌ FAIL'}
                  {testCase.status === 'pending' && '⏳ PENDING'}
                </div>
              </div>
              <div className="wb-test-expand-icon">
                {expandedId === testCase.id ? '▼' : '▶'}
              </div>
            </div>

            {expandedId === testCase.id && (
              <div className="wb-test-case-details">
                <div className="wb-test-section">
                  <div className="wb-test-section-title">Description</div>
                  <p>{testCase.description}</p>
                </div>

                <div className="wb-test-section">
                  <div className="wb-test-section-title">Steps to Test</div>
                  <ol className="wb-test-steps">
                    {testCase.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="wb-test-section">
                  <div className="wb-test-section-title">Expected Result</div>
                  <p className="wb-test-expected">{testCase.expectedResult}</p>
                </div>

                <div className="wb-test-section">
                  <div className="wb-test-section-title">Test Result</div>
                  <div className="wb-test-actions">
                    <button
                      className={`wb-result-btn wb-btn-pass ${testCase.status === 'pass' ? 'active' : ''}`}
                      onClick={() => updateTestCase(testCase.id, {
                        status: 'pass',
                        testedAt: new Date().toLocaleString()
                      })}
                    >
                      ✅ Mark as Pass
                    </button>
                    <button
                      className={`wb-result-btn wb-btn-fail ${testCase.status === 'fail' ? 'active' : ''}`}
                      onClick={() => updateTestCase(testCase.id, {
                        status: 'fail',
                        testedAt: new Date().toLocaleString()
                      })}
                    >
                      ❌ Mark as Fail
                    </button>
                    <button
                      className={`wb-result-btn wb-btn-reset ${testCase.status === 'pending' ? 'active' : ''}`}
                      onClick={() => updateTestCase(testCase.id, {
                        status: 'pending',
                        comments: '',
                        testedAt: undefined
                      })}
                    >
                      ⏳ Reset
                    </button>
                  </div>
                </div>

                <div className="wb-test-section">
                  <div className="wb-test-section-title">Comments & Issues</div>
                  <textarea
                    className="wb-test-comments"
                    placeholder="Add any comments, issues, or observations here..."
                    value={testCase.comments}
                    onChange={(e) => updateTestCase(testCase.id, { comments: e.target.value })}
                  />
                  {testCase.testedAt && (
                    <div className="wb-test-metadata">
                      Tested at: {testCase.testedAt}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Export/Import Section */}
      <div className="wb-test-export">
        <h3>📊 Export Results</h3>
        <p>Share test results with the team</p>
        <div className="wb-export-buttons">
          <button
            className="wb-export-btn"
            onClick={() => {
              const json = JSON.stringify(testCases, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `webubble-test-results-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            📥 Download JSON Report
          </button>
          <button
            className="wb-export-btn"
            onClick={() => {
              const csv = [
                ['Test ID', 'Name', 'Status', 'Comments', 'Tested At'].join(','),
                ...testCases.map(tc =>
                  [
                    tc.id,
                    `"${tc.name}"`,
                    tc.status.toUpperCase(),
                    `"${tc.comments.replace(/"/g, '""')}"`,
                    tc.testedAt || ''
                  ].join(',')
                )
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `webubble-test-results-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            📊 Download CSV Report
          </button>
          <button
            className="wb-export-btn wb-reset-all"
            onClick={() => {
              if (confirm('Reset all test cases to pending?')) {
                setTestCases(testCases.map(tc => ({
                  ...tc,
                  status: 'pending',
                  comments: '',
                  testedAt: undefined
                })));
              }
            }}
          >
            🔄 Reset All
          </button>
        </div>
      </div>

      <style jsx>{`
        .wb-test-cases-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          background: #fff;
        }

        .wb-test-cases-header {
          margin-bottom: 32px;
        }

        .wb-test-cases-title {
          margin-bottom: 24px;
        }

        .wb-test-cases-title h1 {
          font-size: 32px;
          font-weight: 700;
          color: #203b32;
          margin: 0 0 8px 0;
        }

        .wb-test-cases-title p {
          font-size: 16px;
          color: #666;
          margin: 0;
        }

        .wb-test-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .wb-stat-card {
          padding: 16px;
          border-radius: 8px;
          background: #f5f5f5;
          text-align: center;
          border-left: 4px solid #ddd;
        }

        .wb-stat-total {
          border-left-color: #315d49;
          background: rgba(49, 93, 73, 0.05);
        }

        .wb-stat-pass {
          border-left-color: #28a745;
          background: rgba(40, 167, 69, 0.05);
        }

        .wb-stat-fail {
          border-left-color: #dc3545;
          background: rgba(220, 53, 69, 0.05);
        }

        .wb-stat-pending {
          border-left-color: #ffc107;
          background: rgba(255, 193, 7, 0.05);
        }

        .wb-stat-progress {
          grid-column: 1 / -1;
        }

        .wb-stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #203b32;
        }

        .wb-stat-label {
          font-size: 13px;
          color: #666;
          margin-top: 4px;
          font-weight: 500;
        }

        .wb-stat-progress-bar {
          height: 8px;
          background: #eee;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .wb-stat-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #315d49, #4a7f6b);
          transition: width 0.3s ease;
        }

        .wb-test-filter {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .wb-filter-btn {
          padding: 10px 16px;
          border: 2px solid #ddd;
          background: #fff;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          color: #666;
          transition: all 0.2s ease;
        }

        .wb-filter-btn:hover {
          border-color: #315d49;
          color: #315d49;
        }

        .wb-filter-btn.active {
          background: #315d49;
          border-color: #315d49;
          color: #fff;
        }

        .wb-filter-count {
          font-weight: 700;
        }

        .wb-test-cases-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }

        .wb-test-case {
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          transition: all 0.2s ease;
        }

        .wb-test-case.wb-status-pass {
          border-left: 4px solid #28a745;
        }

        .wb-test-case.wb-status-fail {
          border-left: 4px solid #dc3545;
        }

        .wb-test-case.wb-status-pending {
          border-left: 4px solid #ffc107;
        }

        .wb-test-case-header {
          padding: 16px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }

        .wb-test-case-header:hover {
          background: #f9f9f9;
        }

        .wb-test-case-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .wb-test-id {
          font-weight: 700;
          color: #315d49;
          min-width: 60px;
          font-size: 12px;
          font-family: monospace;
        }

        .wb-test-name {
          font-weight: 600;
          color: #203b32;
          flex: 1;
        }

        .wb-test-status-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .wb-badge-pass {
          background: rgba(40, 167, 69, 0.1);
          color: #28a745;
        }

        .wb-badge-fail {
          background: rgba(220, 53, 69, 0.1);
          color: #dc3545;
        }

        .wb-badge-pending {
          background: rgba(255, 193, 7, 0.1);
          color: #ff9800;
        }

        .wb-test-expand-icon {
          color: #999;
          font-size: 12px;
          margin-left: 12px;
        }

        .wb-test-case-details {
          padding: 16px;
          border-top: 1px solid #eee;
          background: #fafafa;
        }

        .wb-test-section {
          margin-bottom: 16px;
        }

        .wb-test-section:last-child {
          margin-bottom: 0;
        }

        .wb-test-section-title {
          font-weight: 700;
          color: #203b32;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .wb-test-section p {
          margin: 0;
          color: #555;
          line-height: 1.6;
        }

        .wb-test-expected {
          background: #fff;
          padding: 12px;
          border-radius: 4px;
          border-left: 3px solid #315d49;
        }

        .wb-test-steps {
          margin: 0;
          padding-left: 20px;
          color: #555;
        }

        .wb-test-steps li {
          margin-bottom: 6px;
          line-height: 1.5;
        }

        .wb-test-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .wb-result-btn {
          padding: 10px 16px;
          border: 1px solid #ddd;
          background: #fff;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .wb-result-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .wb-btn-pass {
          border-color: #28a745;
          color: #28a745;
        }

        .wb-btn-pass:hover {
          background: rgba(40, 167, 69, 0.05);
        }

        .wb-btn-pass.active {
          background: #28a745;
          color: #fff;
          border-color: #28a745;
        }

        .wb-btn-fail {
          border-color: #dc3545;
          color: #dc3545;
        }

        .wb-btn-fail:hover {
          background: rgba(220, 53, 69, 0.05);
        }

        .wb-btn-fail.active {
          background: #dc3545;
          color: #fff;
          border-color: #dc3545;
        }

        .wb-btn-reset {
          border-color: #ffc107;
          color: #ff9800;
        }

        .wb-btn-reset:hover {
          background: rgba(255, 193, 7, 0.05);
        }

        .wb-btn-reset.active {
          background: #ffc107;
          color: #fff;
          border-color: #ffc107;
        }

        .wb-test-comments {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
          color: #555;
          resize: vertical;
        }

        .wb-test-comments:focus {
          outline: none;
          border-color: #315d49;
          box-shadow: 0 0 0 3px rgba(49, 93, 73, 0.1);
        }

        .wb-test-metadata {
          font-size: 12px;
          color: #999;
          margin-top: 8px;
        }

        .wb-test-export {
          background: #f5f5f5;
          padding: 24px;
          border-radius: 8px;
          text-align: center;
        }

        .wb-test-export h3 {
          margin: 0 0 4px 0;
          color: #203b32;
          font-size: 18px;
        }

        .wb-test-export p {
          margin: 0 0 16px 0;
          color: #666;
        }

        .wb-export-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .wb-export-btn {
          padding: 12px 20px;
          background: #315d49;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .wb-export-btn:hover {
          background: #254438;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(49, 93, 73, 0.2);
        }

        .wb-export-btn.wb-reset-all {
          background: #dc3545;
        }

        .wb-export-btn.wb-reset-all:hover {
          background: #c82333;
        }

        @media (max-width: 768px) {
          .wb-test-cases-page {
            padding: 16px;
          }

          .wb-test-cases-title h1 {
            font-size: 24px;
          }

          .wb-test-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .wb-test-case-title-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .wb-export-buttons {
            flex-direction: column;
          }

          .wb-export-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
