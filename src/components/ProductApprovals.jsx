import { useState } from 'react';
import Pagination from './Pagination';

export default function ProductApprovals({ user, approvals, onApprove, onDelete, onApproveBulk }) {
  const isAdmin = user?.role === 'admin';
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [approvingIds, setApprovingIds] = useState([]); // for loading state
  const [deletingIds, setDeletingIds] = useState([]); // for loading state
  const [bulkApproving, setBulkApproving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination logic
  const pageSize = 10;
  const totalEntries = approvals.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedApprovals = approvals.slice((activePage - 1) * pageSize, activePage * pageSize);

  const visibleIds = paginatedApprovals.map(r => r.id);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

  function handleSelectAllToggle() {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const next = [...prev];
        visibleIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  }

  function handleSelectToggle(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }

  async function handleApprove(id) {
    if (approvingIds.includes(id)) return;
    setError('');
    setSuccess('');
    setApprovingIds(prev => [...prev, id]);
    
    const res = await onApprove(id);
    if (res && res.success) {
      setSuccess('Product request approved successfully!');
      setSelectedIds(prev => prev.filter(item => item !== id));
      setTimeout(() => setSuccess(''), 2500);
    } else {
      setError(res ? res.message : 'Approval failed.');
    }
    setApprovingIds(prev => prev.filter(item => item !== id));
  }

  async function handleDelete(id) {
    if (deletingIds.includes(id) || !window.confirm('Delete/reject this pending request?')) return;
    setError('');
    setSuccess('');
    setDeletingIds(prev => [...prev, id]);
    
    const res = await onDelete(id);
    if (res && res.success) {
      setSuccess('Product request deleted successfully.');
      setSelectedIds(prev => prev.filter(item => item !== id));
      setTimeout(() => setSuccess(''), 2500);
    } else {
      setError(res ? res.message : 'Deletion failed.');
    }
    setDeletingIds(prev => prev.filter(item => item !== id));
  }

  async function handleBulkApprove() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Approve all ${selectedIds.length} selected requests?`)) return;

    setError('');
    setSuccess('');
    setBulkApproving(true);

    const res = await onApproveBulk(selectedIds);
    if (res && res.success) {
      setSuccess('Selected product requests approved successfully!');
      setSelectedIds([]);
      setTimeout(() => setSuccess(''), 2500);
    } else {
      setError(res ? res.message : 'Bulk approval failed.');
    }
    setBulkApproving(false);
  }

  return (
    <div className="main-layout animate-fade">
      <div className="card">
        <div
          className="card-title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}
        >
          <span>⚖️ Product Approvals Queue</span>

          {isAdmin && selectedIds.length > 0 && (
            <button
              className="btn btn-success btn-sm"
              onClick={handleBulkApprove}
              disabled={bulkApproving || approvingIds.length > 0 || deletingIds.length > 0}
            >
              {bulkApproving ? '⏳ Approving…' : `✔️ Approve Selected Products (${selectedIds.length})`}
            </button>
          )}
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {totalEntries === 0 ? (
          <div className="no-records">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No pending product requests.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="records-table">
                <thead>
                  <tr>
                    {isAdmin && (
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAllToggle}
                          disabled={bulkApproving || approvingIds.length > 0 || deletingIds.length > 0}
                        />
                      </th>
                    )}
                    <th style={{ width: '60px' }}>S/No</th>
                    <th>Date</th>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Action Type</th>
                    {isAdmin && <th style={{ width: '110px' }}>Approve</th>}
                    {isAdmin && <th style={{ width: '110px' }}>Delete</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedApprovals.map((r, i) => {
                    const isApproving = approvingIds.includes(r.id);
                    const isDeleting = deletingIds.includes(r.id);
                    const isRowDisabled = isApproving || isDeleting || bulkApproving;

                    return (
                      <tr key={r.id}>
                        {isAdmin && (
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(r.id)}
                              onChange={() => handleSelectToggle(r.id)}
                              disabled={isRowDisabled}
                            />
                          </td>
                        )}
                        <td style={{ fontWeight: 600 }}>{(activePage - 1) * pageSize + i + 1}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.date || (r.createdAt ? r.createdAt.substring(0, 10) : '—')}</td>
                        <td style={{ fontWeight: 500 }}>{r.productName}</td>
                        <td style={{ fontWeight: 600 }}>{r.quantity}</td>
                        <td>
                          <span className={`badge badge-book ${r.actionType === 'Product Update' ? 'badge-book-small' : 'badge-book-large'}`}>
                            {r.actionType === 'Product Update' ? '✏️' : '✨'} {r.actionType}
                          </span>
                        </td>
                        {isAdmin && (
                          <td>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleApprove(r.id)}
                              disabled={isRowDisabled}
                            >
                              {isApproving ? '⏳' : '✔ Approve'}
                            </button>
                          </td>
                        )}
                        {isAdmin && (
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(r.id)}
                              disabled={isRowDisabled}
                            >
                              {isDeleting ? '⏳' : '🗑️ Delete'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={activePage}
              totalEntries={totalEntries}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
