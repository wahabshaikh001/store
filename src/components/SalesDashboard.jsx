import { useState } from 'react';

export default function SalesDashboard({ products, records, onAddRecord, activeTab }) {
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  
  // Date picker state pre-filled with local today's date (YYYY-MM-DD format)
  const [date, setDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-suggestions logic (case-insensitive filter)
  const filteredSuggestions = productName.trim()
    ? products.filter(p => p.name.toLowerCase().includes(productName.toLowerCase()))
    : [];

  // Active product check
  const trimmedName = productName.trim();
  const matchedProduct = trimmedName 
    ? products.find(p => p.name.toLowerCase() === trimmedName.toLowerCase()) 
    : null;

  function handleAdd(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = productName.trim();
    const qtyVal = parseFloat(quantity);
    const selectedDate = date;

    if (!trimmed || quantity === '') {
      setError('Please fill in all fields.');
      return;
    }
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }
    if (!selectedDate) {
      setError('Every order must have a valid date.');
      return;
    }

    // 1. Verify product availability
    if (!matchedProduct) {
      setError('Product not available');
      return;
    }

    // Create order with manual date and no auto-timestamps
    onAddRecord({
      date: selectedDate,
      productName: matchedProduct.name, // standard casing
      quantity: qtyVal,
      status: 'pending'
    });

    setProductName('');
    setQuantity('');
    setShowSuggestions(false);
    
    // Reset date picker to today's local date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);

    setSuccess('Order added successfully!');
    setTimeout(() => setSuccess(''), 2500);
  }

  function handleSelectSuggestion(name) {
    setProductName(name);
    setShowSuggestions(false);
  }

  return (
    <div className="main-layout animate-fade">
      {activeTab === 'add' && (
        <div className="card">
          <div className="card-title">➕ Add New Order</div>
          
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <form onSubmit={handleAdd}>
            <div className="add-order-grid">
              {/* Product Name with realtime Autocomplete Dropdown */}
              <div className="form-group" style={{ position: 'relative', marginBottom: 0 }}>
                <label htmlFor="productSearch">Product Name</label>
                <input
                  id="productSearch"
                  type="text"
                  className="form-control"
                  placeholder="Type to search (e.g. Sugar)"
                  value={productName}
                  onChange={e => {
                    setProductName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    // Slight delay to allow suggestion onMouseDown click to register first
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  autoFocus
                  autoComplete="off"
                />

                {/* Real-time indicator text */}
                {trimmedName && (
                  <div style={{
                    fontSize: '0.78rem',
                    marginTop: '0.25rem',
                    fontWeight: 600,
                    color: matchedProduct ? 'var(--success-text)' : 'var(--danger)'
                  }}>
                    {matchedProduct 
                      ? `✓ Product available (Current Stock: ${matchedProduct.quantity})` 
                      : `✗ Product not available`
                    }
                  </div>
                )}

                {/* Dropdown container */}
                {showSuggestions && productName.trim().length > 0 && (
                  <div className="suggestions-dropdown">
                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map(p => (
                        <div
                          key={p.id}
                          className="suggestion-item"
                          onMouseDown={(e) => {
                            e.preventDefault(); // prevents blur event
                            handleSelectSuggestion(p.name);
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: p.quantity <= 10 ? 'var(--danger)' : 'var(--text-muted)',
                            fontWeight: p.quantity <= 10 ? 600 : 500
                          }}>
                            Qty: {p.quantity}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="suggestion-no-match">No product found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Product Quantity */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="orderQuantity">Quantity</label>
                <input
                  id="orderQuantity"
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="e.g. 10.5"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                />
              </div>

              {/* Order Date Picker */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="orderDatePicker">Order Date</label>
                <input
                  id="orderDatePicker"
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Add Order
            </button>
          </form>
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
                    <th>Date</th>
                    <th>Product Name</th>
                    <th>Product Quantity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.date || r.datetime}</td>
                      <td style={{ fontWeight: 500 }}>{r.productName}</td>
                      <td style={{ fontWeight: 600 }}>{r.quantity}</td>
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
