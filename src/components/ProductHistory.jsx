import { useState, useMemo, memo } from 'react';
import Pagination from './Pagination';
import { useFirestoreSearch } from '../hooks/useFirestoreSearch';

export default memo(function ProductHistory({ user, products = [], onDeleteHistory, onDeleteAllHistory }) {
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
    pageSize: 10,
    filterFields: ['productName', 'senderName']
  });

  const totalPages = Math.max(1, Math.ceil(totalEntries / 10));
  const activePage = Math.min(currentPage, totalPages);

  const uniqueProductNames = useMemo(() => Array.from(new Set(products.map(p => p.name).filter(Boolean))), [products]);
  const uniqueSenderNames = useMemo(() => {
    const s = new Set();
    products.forEach(p => {
      if (p.senderName && p.senderName.trim() && p.senderName.trim() !== '--') {
        s.add(p.senderName.trim());
      }
    });
    return Array.from(s);
  }, [products]);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const prodMatches = uniqueProductNames
      .filter(name => name.toLowerCase().includes(query))
      .map(name => ({ type: 'Product', value: name }));
    const senderMatches = uniqueSenderNames
      .filter(name => name.toLowerCase().includes(query))
      .map(name => ({ type: 'Sender', value: name }));
    return [...prodMatches, ...senderMatches].slice(0, 10);
  }, [searchQuery, uniqueProductNames, uniqueSenderNames]);

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

  // Export to Excel / CSV
  function handleExportExcel() {
    const headers = ['S/NO', 'Date', 'Sender Name', 'Product Name', 'Quantity Added'];
    const rows = historyRecords.map((r, idx) => [
      (activePage - 1) * 10 + idx + 1,
      `"${(r.date || '—').replace(/"/g, '""')}"`,
      `"${(r.senderName?.trim() || '--').replace(/"/g, '""')}"`,
      `"${(r.productName || '').replace(/"/g, '""')}"`,
      r.quantityAdded
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "product_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Copy to Clipboard
  function handleCopy() {
    const headers = 'S/NO\tDate\tSender Name\tProduct Name\tQuantity Added';
    const rows = historyRecords.map((r, idx) => `${(activePage - 1) * 10 + idx + 1}\t${r.date || '—'}\t${r.senderName?.trim() || '--'}\t${r.productName || ''}\t+${r.quantityAdded}`).join('\n');
    navigator.clipboard.writeText(headers + '\n' + rows);
    alert('Product history copied to clipboard!');
  }

  // Print / Save PDF
  function handlePrint() {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Product History Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: sans-serif; padding: 25px; color: #0f172a; }');
    printWindow.document.write('h2 { color: #4f46e5; text-align: center; margin-bottom: 5px; }');
    printWindow.document.write('p { text-align: center; color: #64748b; font-size: 0.9rem; margin-bottom: 20px; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-top: 10px; }');
    printWindow.document.write('th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 0.9rem; }');
    printWindow.document.write('th { background-color: #f8fafc; font-weight: bold; color: #475569; }');
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<h2>Product History Report - StoreManager</h2>');
    printWindow.document.write(`<p>Generated on: ${new Date().toLocaleString()}</p>`);
    printWindow.document.write('<table><thead><tr><th>S/NO</th><th>Date</th><th>Sender Name</th><th>Product Name</th><th>Quantity Added</th></tr></thead><tbody>');
    
    historyRecords.forEach((r, idx) => {
      printWindow.document.write(
        `<tr><td>${(activePage - 1) * 10 + idx + 1}</td><td>${r.date || '—'}</td><td>${r.senderName?.trim() || '--'}</td><td>${r.productName || ''}</td><td>+${r.quantityAdded}</td></tr>`
      );
    });
    
    printWindow.document.write('</tbody></table></body></html>');
    printWindow.document.close();
    printWindow.print();
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

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Export options */}
            {historyRecords.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={handlePrint}>📄 PDF / Print</button>
                <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>📥 Excel</button>
                <button className="btn btn-secondary btn-sm" onClick={handleCopy}>📋 Copy</button>
              </div>
            )}

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
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              style={{ width: '100%' }}
              placeholder="Search by product or sender name..."
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
                  filteredSuggestions.map((item, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onMouseDown={e => {
                        e.preventDefault();
                        executeSearch(item.value);
                        setShowSuggestions(false);
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{item.value}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({item.type})</span>
                    </div>
                  ))
                ) : (
                  <div className="suggestion-no-match">No matching products or senders found</div>
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
                    <th>Sender Name</th>
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
                      <td style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{r.senderName?.trim() || '--'}</td>
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
});
