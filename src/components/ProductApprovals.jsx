import { useState } from 'react';
import Pagination from './Pagination';

export default function ProductApprovals({ user, approvals, onApprove, onDelete, onApproveBulk, onEditApproval }) {
  const isAdmin = user?.role === 'admin';
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [approvingIds, setApprovingIds] = useState([]); // for loading state
  const [deletingIds, setDeletingIds] = useState([]); // for loading state
  const [bulkApproving, setBulkApproving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');

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

  function startEdit(req) {
    setEditingId(req.id);
    setEditName(req.productName || '');
    setEditQuantity(String(req.quantity ?? ''));
    setError('');
    setSuccess('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditQuantity('');
  }

  async function saveEdit(id) {
    setError('');
    const trimmedName = editName.trim();
    const qtyVal = parseFloat(editQuantity);

    if (!trimmedName || editQuantity === '') {
      setError('Please fill in all fields.');
      return;
    }
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    try {
      const res = await onEditApproval(id, {
        productName: trimmedName,
        quantity: qtyVal
      });

      if (res && res.success) {
        setSuccess('Approval request updated successfully.');
        setEditingId(null);
        setTimeout(() => setSuccess(''), 2500);
      } else {
        setError(res ? res.message : 'Update failed.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during save.');
    }
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
                          disabled={bulkApproving || approvingIds.length > 0 || deletingIds.length > 0 || editingId !== null}
                        />
                      </th>
                    )}
                    <th style={{ width: '60px' }}>S/No</th>
                    <th>Date</th>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Action Type</th>
                    {isAdmin && <th style={{ width: '110px' }}>Edit</th>}
                    {isAdmin && <th style={{ width: '110px' }}>Approve</th>}
                    {isAdmin && <th style={{ width: '110px' }}>Delete</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedApprovals.map((r, i) => {
                    const isEditing = r.id === editingId;
                    const isApproving = approvingIds.includes(r.id);
                    const isDeleting = deletingIds.includes(r.id);
                    
                    // Disable row actions if bulk approving, any approval/deletion is active, or editing another row
                    const isActionDisabled = bulkApproving || approvingIds.length > 0 || deletingIds.length > 0 || (editingId !== null && !isEditing);
                    const isRowDisabled = isApproving || isDeleting || isActionDisabled;

                    return (
                      <tr key={r.id}>
                        {isAdmin && (
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(r.id)}
                              onChange={() => handleSelectToggle(r.id)}
                              disabled={isEditing || isRowDisabled}
                            />
                          </td>
                        )}
                        <td style={{ fontWeight: 600 }}>{(activePage - 1) * pageSize + i + 1}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.date || (r.createdAt ? r.createdAt.substring(0, 10) : '—')}</td>
                        
                        {isEditing ? (
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              style={{ padding: '0.35rem 0.6rem' }}
                            />
                          </td>
                        ) : (
                          <td style={{ fontWeight: 500 }}>{r.productName}</td>
                        )}

                        {isEditing ? (
                          <td>
                            <input
                              type="number"
                              step="any"
                              className="form-control form-control-sm"
                              value={editQuantity}
                              onChange={e => setEditQuantity(e.target.value)}
                              style={{ padding: '0.35rem 0.6rem' }}
                            />
                          </td>
                        ) : (
                          <td style={{ fontWeight: 600 }}>{r.quantity}</td>
                        )}

                        <td>
                          <span className={`badge badge-book ${r.actionType === 'Product Update' ? 'badge-book-small' : 'badge-book-large'}`}>
                            {r.actionType === 'Product Update' ? '✏️' : '✨'} {r.actionType}
                          </span>
                        </td>
                        {isAdmin && (
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => saveEdit(r.id)}
                                  disabled={isApproving || isDeleting}
                                >
                                  💾 Save
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={cancelEdit}
                                  disabled={isApproving || isDeleting}
                                >
                                  ❌
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => startEdit(r)}
                                disabled={isRowDisabled}
                                style={isRowDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                              >
                                ✏️ Edit
                              </button>
                            )}
                          </td>
                        )}
                        {isAdmin && (
                          <td>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleApprove(r.id)}
                              disabled={isEditing || isRowDisabled}
                              style={(isEditing || isRowDisabled) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
                              disabled={isEditing || isRowDisabled}
                              style={(isEditing || isRowDisabled) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
