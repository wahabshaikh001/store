import { useState } from 'react';
import Pagination from './Pagination';

export default function ProductHistory({ user, historyRecords, onDeleteHistory, onDeleteAllHistory }) {
  const isAdmin = user?.role === 'admin';
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(historyRecords.length / 10));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedHistory = historyRecords.slice((activePage - 1) * 10, activePage * 10);

  const [confirmAll, setConfirmAll] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDeleteAll() {
    if (!confirmAll) {
      setConfirmAll(true);
      return;
    }
    setLoading(true);
    await onDeleteAllHistory();
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
          <span>📋 Product History List</span>

          {isAdmin && historyRecords.length > 0 && (
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
                {loading ? 'Deleting…' : confirmAll ? '⚠️ Confirm Delete All' : '🗑️ Delete All History'}
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

        {historyRecords.length === 0 ? (
          <div className="no-records">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No product history records found.</p>
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
                  <th>Quantity Added</th>
                  {isAdmin && <th style={{ width: '110px' }}>Delete</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{(activePage - 1) * 10 + i + 1}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.date || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{r.productName}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>+{r.quantityAdded}</td>
                    {isAdmin && (
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (window.confirm('Delete this history record?')) {
                              onDeleteHistory(r.id);
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
            totalEntries={historyRecords.length}
            pageSize={10}
            onPageChange={setCurrentPage}
          />
        </>
      )}
      </div>
    </div>
  );
}
