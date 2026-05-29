import { useState } from 'react';

function formatDateTime() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  let h = now.getHours();
  const min = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${dd}/${mm}/${yy} ${String(h).padStart(2,'0')}:${min} ${ampm}`;
}

export default function SalesDashboard({ products, records, onAddRecord, activeTab }) {
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = productName.trim();
    const qtyVal = parseFloat(quantity);

    if (!trimmedName || quantity === '') {
      setError('Please fill in all fields.');
      return;
    }
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    // 1. Check if product exists in Products collection
    const matchedProduct = products.find(
      p => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (!matchedProduct) {
      setError('Product not found');
      return;
    }

    // 2. Check if inventory has sufficient stock
    if (matchedProduct.quantity < qtyVal) {
      setError('Insufficient stock');
      return;
    }

    // Submit order
    onAddRecord({
      datetime: formatDateTime(),
      productName: matchedProduct.name, // save name with correct case
      quantity: qtyVal,
      status: 'pending'
    });

    setProductName('');
    setQuantity('');
    setSuccess('Order added successfully!');
    setTimeout(() => setSuccess(''), 2500);
  }

  return (
    <div className="main-layout animate-fade">
      {activeTab === 'add' && (
        <div className="card">
          <div className="card-title">➕ Add New Order</div>
          
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <form onSubmit={handleAdd}>
            <div className="add-order-row">
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Product Name (e.g. Sugar)"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="Quantity (e.g. 10.5)"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">Add Order</button>
            </div>
          </form>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
            ℹ️ Product must already exist in inventory and have sufficient stock.
          </p>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="card">
          <div className="card-title">📄 My Orders</div>
          {records.length === 0 ? (
            <div className="no-records">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No orders yet. Go to <strong>Add Order</strong> to create one.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>S/No</th>
                    <th>Date &amp; Time</th>
                    <th>Product Name</th>
                    <th>Product Quantity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.datetime}</td>
                      <td style={{ fontWeight: 500 }}>{r.productName || r.order}</td>
                      <td style={{ fontWeight: 600 }}>{r.quantity ?? '—'}</td>
                      <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
