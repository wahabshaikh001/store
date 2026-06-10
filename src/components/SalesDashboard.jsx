import { useState } from 'react';
import Pagination from './Pagination';

/* ── Reusable order‑entry form for a specific book type ── */
function BookOrderForm({ bookType, bookEmoji, products, onAddRecord, idPrefix }) {
  const todayStr = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  };

  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(todayStr);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filteredSuggestions = productName.trim()
    ? products.filter(p => p.name.toLowerCase().includes(productName.toLowerCase()))
    : [];

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

    if (!trimmed || quantity === '') {
      setError('Please fill in all fields.');
      return;
    }
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }
    if (!date) {
      setError('Every order must have a valid date.');
      return;
    }
    if (!matchedProduct) {
      setError('Product not available');
      return;
    }

    onAddRecord({
      date,
      productName: matchedProduct.name,
      quantity: qtyVal,
      bookType,
      status: 'pending'
    });

    setProductName('');
    setQuantity('');
    setDate(todayStr());
    setShowSuggestions(false);
    setSuccess('Order added successfully!');
    setTimeout(() => setSuccess(''), 2500);
  }

  function handleSelectSuggestion(name) {
    setProductName(name);
    setShowSuggestions(false);
  }

  return (
    <div className="book-order-section">
      <div className="book-order-heading">
        <span className="book-order-emoji">{bookEmoji}</span>
        {bookType}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleAdd}>
        <div className="add-order-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {/* Order Date */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`${idPrefix}Date`}>Date</label>
            <input
              id={`${idPrefix}Date`}
              type="date"
              className="form-control"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Product Name with realtime Autocomplete */}
          <div className="form-group" style={{ position: 'relative', marginBottom: 0 }}>
            <label htmlFor={`${idPrefix}Product`}>Product Name</label>
            <input
              id={`${idPrefix}Product`}
              type="text"
              className="form-control"
              placeholder="Type to search (e.g. Sugar)"
              value={productName}
              onChange={e => {
                setProductName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              autoComplete="off"
            />

            {trimmedName && (
              <div style={{
                fontSize: '0.78rem',
                marginTop: '0.25rem',
                fontWeight: 600,
                color: matchedProduct ? 'var(--success-text)' : 'var(--danger)'
              }}>
                {matchedProduct
                  ? `✓ Product available (Current Stock: ${matchedProduct.quantity})`
                  : '✗ Product not available'}
              </div>
            )}

            {showSuggestions && productName.trim().length > 0 && (
              <div className="suggestions-dropdown">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map(p => (
                    <div
                      key={p.id}
                      className="suggestion-item"
                      onMouseDown={e => {
                        e.preventDefault();
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
            <label htmlFor={`${idPrefix}Qty`}>Product Quantity</label>
            <input
              id={`${idPrefix}Qty`}
              type="number"
              step="any"
              className="form-control"
              placeholder="e.g. 10.5"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
          Add {bookType} Order
        </button>
      </form>
    </div>
  );
}

/* ── Main Sales Dashboard ── */
export default function SalesDashboard({ products, records, onAddRecord, activeTab }) {
  const [bookTab, setBookTab] = useState('Large Book');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter records by book type for the My Orders tab
  const filteredByBook = records.filter(r => (r.bookType || 'Large Book') === bookTab);

  const totalPages = Math.max(1, Math.ceil(filteredByBook.length / 10));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredByBook.slice((activePage - 1) * 10, activePage * 10);

  function handleBookTabChange(tab) {
    setBookTab(tab);
    setCurrentPage(1);
  }

  return (
    <div className="main-layout animate-fade">
      {activeTab === 'add' && (
        <div className="card">
          <div className="card-title">➕ Add New Order</div>

          <div className="dual-order-layout">
            <BookOrderForm
              bookType="Small Book"
              bookEmoji="📗"
              products={products}
              onAddRecord={onAddRecord}
              idPrefix="small"
            />

            <BookOrderForm
              bookType="Large Book"
              bookEmoji="📘"
              products={products}
              onAddRecord={onAddRecord}
              idPrefix="large"
            />
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="card">
          <div className="card-title">📄 My Orders</div>

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

          {filteredByBook.length === 0 ? (
            <div className="no-records">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No {bookTab} orders yet. Go to <strong>Add Order</strong> to create one.</p>
            </div>
          ) : (
            <>
              <div className="table-wrap">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>S/No</th>
                    <th>Date</th>
                    <th>Product Name</th>
                    <th>Product Quantity</th>
                    <th>Book Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{(activePage - 1) * 10 + i + 1}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.date || r.datetime}</td>
                      <td style={{ fontWeight: 500 }}>{r.productName}</td>
                      <td style={{ fontWeight: 600 }}>{r.quantity}</td>
                      <td>
                        <span className={`badge badge-book ${r.bookType === 'Small Book' ? 'badge-book-small' : 'badge-book-large'}`}>
                          {r.bookType === 'Small Book' ? '📗' : '📘'} {r.bookType || 'Large Book'}
                        </span>
                      </td>
                      <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
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
      )}
    </div>
  );
}
