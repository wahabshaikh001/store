import { useState } from 'react';

export default function AdminDashboard({ records, products, onApproveRecord, onDeleteRecord, onEditRecord }) {
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editProductName, setEditProductName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editDate, setEditDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setError('');
    setSuccess('');

    // Pre-check stock locally
    const order = records.find(r => r.id === orderId);
    if (!order) {
      setError('Order not found.');
      return;
    }
    const prod = products.find(p => p.name.toLowerCase() === order.productName.toLowerCase());
    if (!prod) {
      setError('Product not found in inventory.');
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
  }

  return (
    <div className="main-layout animate-fade">
      <div className="card">
        <div className="card-title">🛡️ Pending Orders — Admin Approval</div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {records.length === 0 ? (
          <div className="no-records">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>All orders approved! Nothing pending.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>S/No</th>
                  <th>Date</th>
                  <th>Product Name</th>
                  <th>Product Quantity</th>
                  <th style={{ width: '110px' }}>Approve</th>
                  <th style={{ width: '110px' }}>Edit</th>
                  <th style={{ width: '110px' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const isEditing = r.id === editingOrderId;
                  
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{i + 1}</td>
                      
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
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApprove(r.id)}
                          disabled={isEditing}
                          style={isEditing ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          ✔ Approve
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
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </td>

                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => { if(window.confirm('Delete this order?')) onDeleteRecord(r.id); }}
                          disabled={isEditing}
                          style={isEditing ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
        )}
      </div>
    </div>
  );
}
