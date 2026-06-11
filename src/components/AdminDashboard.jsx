import { useState } from 'react';
import Pagination from './Pagination';

export default function AdminDashboard({ records, products, onApproveRecord, onDeleteRecord, onEditRecord, onDeleteAllOrdersByBookType }) {
  const [bookTab, setBookTab] = useState('Large Book');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter records by book type
  const filteredByBook = records.filter(r => (r.bookType || 'Large Book') === bookTab);
  
  const totalPages = Math.max(1, Math.ceil(filteredByBook.length / 10));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredByBook.slice((activePage - 1) * 10, activePage * 10);

  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editProductName, setEditProductName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editDate, setEditDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [approvingOrderId, setApprovingOrderId] = useState(null);

  function handleBookTabChange(tab) {
    setBookTab(tab);
    setCurrentPage(1);
    setEditingOrderId(null);
    setError('');
    setSuccess('');
    setConfirmDeleteAll(false);
  }

  // Start editing order
  function startEdit(order) {
    setEditingOrderId(order.id);
    setEditProductName(order.productName || order.order || '');
    setEditQuantity(String(order.quantity ?? ''));
    setEditDate(order.date || '');
    setError('');
    setSuccess('');
  }

  // Cancel editing order
  function cancelEdit() {
    setEditingOrderId(null);
    setEditProductName('');
    setEditQuantity('');
    setEditDate('');
    setError('');
  }

  // Save edited order
  function saveEdit(orderId) {
    setError('');
    const trimmedName = editProductName.trim();
    const qtyVal = parseFloat(editQuantity);
    const selectedDate = editDate;

    if (!trimmedName || editQuantity === '' || !selectedDate) {
      setError('Please fill in all fields.');
      return;
    }
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    // Verify product exists locally
    const prod = products.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (!prod) {
      setError('Product not found in inventory.');
      return;
    }

    // Stock check bypassed to allow negative inventory

    onEditRecord(orderId, {
      productName: prod.name,
      quantity: qtyVal,
      date: selectedDate
    });
    setEditingOrderId(null);
    setSuccess('Order updated successfully.');
    setTimeout(() => setSuccess(''), 2000);
  }

  // Approve order
  async function handleApprove(orderId) {
    if (approvingOrderId) return; // Already approving another order
    setError('');
    setSuccess('');
    setApprovingOrderId(orderId);

    // Pre-check stock locally
    const order = records.find(r => r.id === orderId);
    if (!order) {
      setError('Order not found.');
      setApprovingOrderId(null);
      return;
    }
    const prod = products.find(p => p.name.toLowerCase() === order.productName.toLowerCase());
    if (!prod) {
      setError('Product not found in inventory.');
      setApprovingOrderId(null);
      return;
    }
    // Stock check bypassed to allow negative inventory

    // Execute backend transaction
    const res = await onApproveRecord(orderId);
    if (res && !res.success) {
      setError(res.message);
    } else {
      setSuccess('Order approved and stock updated successfully!');
      setTimeout(() => setSuccess(''), 2500);
    }
    setApprovingOrderId(null);
  }

  async function handleDeleteAllByBook() {
    if (!confirmDeleteAll) {
      setConfirmDeleteAll(true);
      return;
    }
    setDeleteAllLoading(true);
    await onDeleteAllOrdersByBookType(bookTab);
    setConfirmDeleteAll(false);
    setDeleteAllLoading(false);
    setSuccess(`All ${bookTab} orders deleted successfully.`);
    setTimeout(() => setSuccess(''), 2500);
  }

  return (
    <div className="main-layout animate-fade">
      <div className="card">
        <div
          className="card-title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}
        >
          <span>🛡️ Pending Orders — Admin Approval</span>

          {filteredByBook.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {confirmDeleteAll && (
                <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                  Are you sure?
                </span>
              )}
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDeleteAllByBook}
                disabled={deleteAllLoading}
              >
                {deleteAllLoading
                  ? 'Deleting…'
                  : confirmDeleteAll
                    ? `⚠️ Confirm Delete All`
                    : `🗑️ Delete All ${bookTab} Orders`}
              </button>
              {confirmDeleteAll && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setConfirmDeleteAll(false)}
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
            <span className="book-tab-count">{records.filter(r => (r.bookType || 'Large Book') === 'Large Book').length}</span>
          </button>
          <button
            className={`book-tab ${bookTab === 'Small Book' ? 'active' : ''}`}
            onClick={() => handleBookTabChange('Small Book')}
          >
            📗 Small Book
            <span className="book-tab-count">{records.filter(r => r.bookType === 'Small Book').length}</span>
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {filteredByBook.length === 0 ? (
          <div className="no-records">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No {bookTab} orders pending. All clear!</p>
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
                  <th style={{ width: '110px' }}>Approve</th>
                  <th style={{ width: '110px' }}>Edit</th>
                  <th style={{ width: '110px' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((r, i) => {
                  const isEditing = r.id === editingOrderId;
                  const isApproving = r.id === approvingOrderId;
                  
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{(activePage - 1) * 10 + i + 1}</td>
                      
                      {isEditing ? (
                        <td>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={editDate}
                            onChange={e => setEditDate(e.target.value)}
                            style={{ padding: '0.35rem 0.6rem' }}
                          />
                        </td>
                      ) : (
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.date || r.datetime}</td>
                      )}
                      
                      {isEditing ? (
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editProductName}
                            onChange={e => setEditProductName(e.target.value)}
                            style={{ padding: '0.35rem 0.6rem' }}
                          />
                        </td>
                      ) : (
                        <td style={{ fontWeight: 500 }}>{r.productName || r.order}</td>
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
                        <td style={{ fontWeight: 600 }}>{r.quantity ?? '—'}</td>
                      )}

                      <td>
                        <span className={`badge badge-book ${r.bookType === 'Small Book' ? 'badge-book-small' : 'badge-book-large'}`}>
                          {r.bookType === 'Small Book' ? '📗' : '📘'} {r.bookType || 'Large Book'}
                        </span>
                      </td>

                      <td>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApprove(r.id)}
                          disabled={isEditing || isApproving || (approvingOrderId !== null)}
                          style={(isEditing || isApproving || approvingOrderId !== null) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          {isApproving ? '⏳ Approving…' : '✔ Approve'}
                        </button>
                      </td>

                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => saveEdit(r.id)}
                            >
                              💾 Save
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={cancelEdit}
                            >
                              ❌
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => startEdit(r)}
                            disabled={isApproving}
                            style={isApproving ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </td>

                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => { if(window.confirm('Delete this order?')) onDeleteRecord(r.id); }}
                          disabled={isEditing || isApproving}
                          style={(isEditing || isApproving) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
