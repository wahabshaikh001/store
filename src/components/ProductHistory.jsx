import { useState } from 'react';
import Pagination from './Pagination';
import { useFirestoreSearch } from '../hooks/useFirestoreSearch';

export default function ProductHistory({ user, products = [], onDeleteHistory, onDeleteAllHistory }) {
  const isAdmin = user?.role === 'admin';

  const {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    appliedSearchQuery,
    records: historyRecords,
    totalEntries,
    isFetching,
    errorMsg,
    executeSearch,
    clearSearch,
    forceRefetch
  } = useFirestoreSearch({
    collectionName: 'productHistory',
    orderByField: 'createdAt',
    orderDirection: 'desc',
    pageSize: 10
  });

  const totalPages = Math.max(1, Math.ceil(totalEntries / 10));
  const activePage = Math.min(currentPage, totalPages);

  const uniqueProductNames = Array.from(new Set(products.map(p => p.name)));

  const filteredSuggestions = searchQuery.trim()
    ? uniqueProductNames
        .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 10)
    : [];

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDeleteAll() {
    if (!confirmAll) {
      setConfirmAll(true);
      return;
    }
    setLoading(true);
    await onDeleteAllHistory();
    await forceRefetch();
    setConfirmAll(false);
    setLoading(false);
  }

  async function handleSingleDelete(id) {
    if (window.confirm('Delete this history record?')) {
      setLoading(true);
      await onDeleteHistory(id);
      await forceRefetch();
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
          <span>📋 Product History List</span>

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
                {loading ? 'Deleting…' : confirmAll ? '⚠️ Confirm Delete All' : '🗑️ Delete All History'}
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

        {isFetching && historyRecords.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading history…
          </div>
        ) : totalEntries === 0 ? (
          <div className="no-records">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>
              {appliedSearchQuery.trim()
                ? `No matching history records found for "${appliedSearchQuery}".`
                : 'No product history records found.'}
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
                    <th>Quantity Added</th>
                    {isAdmin && <th style={{ width: '110px' }}>Delete</th>}
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{(activePage - 1) * 10 + i + 1}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.date || '—'}</td>
                      <td style={{ fontWeight: 500 }}>{r.productName}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>+{r.quantityAdded}</td>
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
}
