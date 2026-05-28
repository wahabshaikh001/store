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

export default function SalesDashboard({ records, onAddRecord, activeTab }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    const trimmed = text.trim();
    if (!trimmed) { setError('Order cannot be empty.'); return; }
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
      setError('Only letters, numbers, and spaces are allowed.');
      return;
    }
    onAddRecord({ datetime: formatDateTime(), order: trimmed, status: 'pending' });
    setText('');
    setSuccess('Order added successfully!');
    setTimeout(() => setSuccess(''), 2500);
  }

  return (
    <div className="main-layout animate-fade">
      {activeTab === 'add' && (
        <div className="card">
          <div className="card-title">➕ Add New Order</div>
          {error   && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleAdd}>
            <div className="add-order-row">
              <input
                type="text"
                className="form-control"
                placeholder='e.g. 5kg Sugar  or  Rice 10kg'
                value={text}
                onChange={e => setText(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-primary">Add Order</button>
            </div>
          </form>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
            ℹ️ Letters, numbers and spaces only.
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
                    <th>#</th>
                    <th>Date &amp; Time</th>
                    <th>Order</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.datetime}</td>
                      <td style={{ fontWeight: 500 }}>{r.order}</td>
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
