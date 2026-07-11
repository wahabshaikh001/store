import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer
} from 'firebase/firestore';
import Pagination from './Pagination';

export default function ApprovedOrders({ user, products = [], onDeleteApproved, onDeleteAllApproved }) {
  const isAdmin = user?.role === 'admin';
  const [bookTab, setBookTab] = useState('Large Book');
  const [currentPage, setCurrentPage] = useState(1);
  const [allApprovedOrders, setAllApprovedOrders] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchAllApproved = useCallback(async () => {
    setIsFetching(true);
    setErrorMsg('');
    try {
      console.log('[Firestore] [ApprovedOrders] Fetching all approved orders...');
      const q = query(
        collection(db, 'approvedOrders'),
        orderBy('approvedAt', 'asc')
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllApprovedOrders(list);
    } catch (e) {
      console.error("[Firestore] [ApprovedOrders] Error fetching all approved orders:", e);
      if (e.message && e.message.toLowerCase().includes('index')) {
        setErrorMsg('This view requires a Firestore composite index. Please check your developer tools console for the link to create the index.');
      } else {
        setErrorMsg('Failed to load records. Please check your network connection.');
      }
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Fetch all approved orders on mount
  useEffect(() => {
    fetchAllApproved();
  }, [fetchAllApproved]);

  const largeBookCount = allApprovedOrders.filter(r => (r.bookType || 'Large Book') === 'Large Book').length;
  const smallBookCount = allApprovedOrders.filter(r => r.bookType === 'Small Book').length;

  const totalEntries = bookTab === 'Large Book' ? largeBookCount : smallBookCount;

  const uniqueProductNames = Array.from(new Set([
    ...products.map(p => p.name),
    ...allApprovedOrders.map(r => r.productName).filter(Boolean)
  ]));

  const filteredSuggestions = searchQuery.trim()
    ? uniqueProductNames.filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredByBook = allApprovedOrders.filter(r => (r.bookType || 'Large Book') === bookTab);

  const filteredApproved = filteredByBook.filter(r => {
    return searchQuery.trim()
      ? r.productName.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
  });

  const totalFilteredEntries = filteredApproved.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredEntries / 10));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedApproved = filteredApproved.slice((activePage - 1) * 10, activePage * 10);

  // Keep currentPage inside valid range if list changes
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(filteredApproved.length / 10));
    if (currentPage > pages) {
      setCurrentPage(pages);
    }
  }, [filteredApproved.length, currentPage]);

  const [confirmAll, setConfirmAll] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleBookTabChange(tab) {
    setBookTab(tab);
    setCurrentPage(1);
    setSearchQuery('');
    setConfirmAll(false);
  }

  async function handleDeleteAll() {
    if (!confirmAll) {
      setConfirmAll(true);
      return;
    }
    setLoading(true);
    await onDeleteAllApproved();
    setAllApprovedOrders([]);
    setCurrentPage(1);
    setConfirmAll(false);
    setLoading(false);
  }

  async function handleSingleDelete(id) {
    if (window.confirm('Delete this approved order?')) {
      setLoading(true);
      await onDeleteApproved(id);
      setAllApprovedOrders(prev => prev.filter(r => r.id !== id));
      setLoading(false);
    }
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

          {isAdmin && totalEntries > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {confirmAll && (
                <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                  Are you sure?
                </span>
              )}
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDeleteAll}
                disabled={loading || isFetching}
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
            <span className="book-tab-count">{largeBookCount}</span>
          </button>
          <button
            className={`book-tab ${bookTab === 'Small Book' ? 'active' : ''}`}
            onClick={() => handleBookTabChange('Small Book')}
          >
            📗 Small Book
            <span className="book-tab-count">{smallBookCount}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              style={{ width: '100%' }}
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                setCurrentPage(1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              autoComplete="off"
            />
            {showSuggestions && searchQuery.trim().length > 0 && (
              <div className="suggestions-dropdown" style={{ top: '100%', left: 0, right: 0 }}>
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((name, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onMouseDown={e => {
                        e.preventDefault();
                        setSearchQuery(name);
                        setShowSuggestions(false);
                        setCurrentPage(1);
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{name}</span>
                    </div>
                  ))
                ) : (
                  <div className="suggestion-no-match">No matching products found</div>
                )}
              </div>
            )}
          </div>
          {searchQuery && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
            >
              Clear
            </button>
          )}
        </div>

        {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

        {isFetching && allApprovedOrders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading records…
          </div>
        ) : filteredByBook.length === 0 ? (
          <div className="no-records">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No {bookTab} approved orders yet.</p>
          </div>
        ) : filteredApproved.length === 0 ? (
          <div className="no-records">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No matching approved orders found for "{searchQuery}".</p>
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
                            onClick={() => handleSingleDelete(r.id)}
                            disabled={loading || isFetching}
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
              totalEntries={totalFilteredEntries}
              pageSize={10}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
