import { useState } from 'react';
import Pagination from './Pagination';

export default function ApprovedOrders({ user, approvedOrders, onDeleteApproved, onDeleteAllApproved }) {
  const isAdmin = user?.role === 'admin';
  const [bookTab, setBookTab] = useState('Large Book');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter approved orders by book type
  const filteredByBook = approvedOrders.filter(r => (r.bookType || 'Large Book') === bookTab);

  const totalPages = Math.max(1, Math.ceil(filteredByBook.length / 10));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedApproved = filteredByBook.slice((activePage - 1) * 10, activePage * 10);

  const [confirmAll, setConfirmAll] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleBookTabChange(tab) {
    setBookTab(tab);
    setCurrentPage(1);
    setConfirmAll(false);
  }

  async function handleDeleteAll() {
    if (!confirmAll) {
      setConfirmAll(true);
      return;
    }
    setLoading(true);
    await onDeleteAllApproved();
    setConfirmAll(false);
    setLoading(false);
  }

  return (
    <div className="main-layout animate-fade">
      <div className="card">
        {/* Header */}
        <div
          className="card-title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}
        >
          <span>✅ Approved Orders List</span>

          {isAdmin && approvedOrders.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {confirmAll && (
                <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                  Are you sure?
                </span>
              )}
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDeleteAll}
                disabled={loading}
              >
                {loading ? 'Deleting…' : confirmAll ? '⚠️ Confirm Delete All' : '🗑️ Delete All Records'}
              </button>
              {confirmAll && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setConfirmAll(false)}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>

        {/* Book Type Sub-Tabs */}
        <div className="book-tabs">
          <button
            className={`book-tab ${bookTab === 'Large Book' ? 'active' : ''}`}
            onClick={() => handleBookTabChange('Large Book')}
          >
            📘 Large Book
            <span className="book-tab-count">{approvedOrders.filter(r => (r.bookType || 'Large Book') === 'Large Book').length}</span>
          </button>
          <button
            className={`book-tab ${bookTab === 'Small Book' ? 'active' : ''}`}
            onClick={() => handleBookTabChange('Small Book')}
          >
            📗 Small Book
            <span className="book-tab-count">{approvedOrders.filter(r => r.bookType === 'Small Book').length}</span>
          </button>
        </div>

        {filteredByBook.length === 0 ? (
          <div className="no-records">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No {bookTab} approved orders yet.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>S/No</th>
                  <th>Date</th>
                  <th>Product Name</th>
                  <th>Product Quantity</th>
                  <th>Book Type</th>
                  {isAdmin && <th style={{ width: '110px' }}>Delete</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedApproved.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{(activePage - 1) * 10 + i + 1}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.date || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{r.productName}</td>
                    <td style={{ fontWeight: 600 }}>{r.quantity}</td>
                    <td>
                      <span className={`badge badge-book ${r.bookType === 'Small Book' ? 'badge-book-small' : 'badge-book-large'}`}>
                        {r.bookType === 'Small Book' ? '📗' : '📘'} {r.bookType || 'Large Book'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (window.confirm('Delete this approved order?')) {
                              onDeleteApproved(r.id);
                            }
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={activePage}
            totalEntries={filteredByBook.length}
            pageSize={10}
            onPageChange={setCurrentPage}
          />
        </>
      )}
      </div>
    </div>
  );
}
