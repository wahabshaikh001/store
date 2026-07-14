import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getCountFromServer
} from 'firebase/firestore';
import Pagination from './Pagination';
import { useFirestoreSearch } from '../hooks/useFirestoreSearch';

export default memo(function ApprovedOrders({ user, products = [], onDeleteApproved, onDeleteAllApproved }) {
  const isAdmin = user?.role === 'admin';
  const [bookTab, setBookTab] = useState('Large Book');

  const {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    appliedSearchQuery,
    records: approvedOrders,
    totalEntries,
    isFetching,
    errorMsg,
    executeSearch,
    clearSearch,
    forceRefetch
  } = useFirestoreSearch({
    collectionName: 'approvedOrders',
    orderByField: 'approvedAt',
    orderDirection: 'asc',
    pageSize: 10,
    extraFilters: [{ field: 'bookType', operator: '==', value: bookTab }]
  });

  const [largeBookCount, setLargeBookCount] = useState(0);
  const [smallBookCount, setSmallBookCount] = useState(0);

  const fetchBookCounts = useCallback(async () => {
    try {
      console.log('[Firestore] [ApprovedOrders] Fetching book tab counts...');
      const qLarge = query(collection(db, 'approvedOrders'), where('bookType', '==', 'Large Book'));
      const qSmall = query(collection(db, 'approvedOrders'), where('bookType', '==', 'Small Book'));
      const [snapLarge, snapSmall] = await Promise.all([
        getCountFromServer(qLarge),
        getCountFromServer(qSmall)
      ]);
      setLargeBookCount(snapLarge.data().count);
      setSmallBookCount(snapSmall.data().count);
    } catch (e) {
      console.error('Error fetching book counts:', e);
    }
  }, []);

  useEffect(() => {
    fetchBookCounts();
  }, [fetchBookCounts]);

  const totalPages = Math.max(1, Math.ceil(totalEntries / 10));
  const activePage = Math.min(currentPage, totalPages);

  const uniqueProductNames = useMemo(() => Array.from(new Set(products.map(p => p.name))), [products]);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return uniqueProductNames
      .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 10);
  }, [searchQuery, uniqueProductNames]);

  const [confirmAll, setConfirmAll] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleBookTabChange(tab) {
    setBookTab(tab);
    setConfirmAll(false);
  }

  async function handleDeleteAll() {
    if (!confirmAll) {
      setConfirmAll(true);
      return;
    }
    setLoading(true);
    await onDeleteAllApproved();
    await forceRefetch();
    await fetchBookCounts();
    setConfirmAll(false);
    setLoading(false);
  }

  const [showSuggestions, setShowSuggestions] = useState(false);

  async function handleSingleDelete(id) {
    if (window.confirm('Delete this approved order?')) {
      setLoading(true);
      await onDeleteApproved(id);
      await forceRefetch();
      await fetchBookCounts();
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
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  executeSearch(searchQuery);
                  setShowSuggestions(false);
                }
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
                        executeSearch(name);
                        setShowSuggestions(false);
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
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              executeSearch(searchQuery);
              setShowSuggestions(false);
            }}
            disabled={!searchQuery.trim()}
          >
            🔍 Search
          </button>
          {(searchQuery || appliedSearchQuery) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={clearSearch}
            >
              Clear
            </button>
          )}
        </div>

        {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

        {isFetching && approvedOrders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading records…
          </div>
        ) : totalEntries === 0 ? (
          <div className="no-records">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>
              {appliedSearchQuery.trim()
                ? `No matching approved orders found for "${appliedSearchQuery}".`
                : `No ${bookTab} approved orders yet.`}
            </p>
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
                  {approvedOrders.map((r, i) => (
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
              totalEntries={totalEntries}
              pageSize={10}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
});
