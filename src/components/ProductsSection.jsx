import { useState, useMemo, memo } from 'react';
import Pagination from './Pagination';

export default memo(function ProductsSection({ user, products, onAddProduct, onEditProduct, onDeleteProduct }) {
  const isAdmin = user?.role === 'admin';

  // Form states
  const [senderName, setSenderName] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Auto-suggestions logic (memoized to avoid recalculation on unrelated state changes)
  const filteredSuggestions = useMemo(() => {
    if (!name.trim()) return [];
    return products.filter(p => p.name.toLowerCase().includes(name.toLowerCase()));
  }, [name, products]);

  // Table filter states
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);

  // Inline edit states
  const [editingId, setEditingId] = useState(null);
  const [editSenderName, setEditSenderName] = useState('');
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editError, setEditError] = useState('');

  // Submit new product
  function handleAddSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedSender = senderName.trim();
    const trimmedName = name.trim();
    const qtyVal = parseFloat(quantity);

    if (!trimmedSender || !trimmedName || quantity === '') {
      setError('Please fill in all fields.');
      return;
    }
    if (isNaN(qtyVal) || qtyVal < 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    // Check duplicate name case-insensitively
    const duplicate = products.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());

    onAddProduct({ senderName: trimmedSender, name: trimmedName, quantity: qtyVal });
    setSenderName('');
    setName('');
    setQuantity('');
    setSuccess(duplicate ? 'Product stock updated successfully!' : 'Product added successfully!');
    setTimeout(() => setSuccess(''), 2500);
  }

  // Handle inline edit click
  function startEdit(product) {
    setEditingId(product.id);
    setEditSenderName(product.senderName || '');
    setEditName(product.name);
    setEditQuantity(String(product.quantity));
    setEditError('');
  }

  // Cancel inline edit
  function cancelEdit() {
    setEditingId(null);
    setEditSenderName('');
    setEditName('');
    setEditQuantity('');
    setEditError('');
  }

  // Save inline edit
  function saveEdit(id) {
    setEditError('');
    const trimmedSender = editSenderName.trim();
    const trimmedName = editName.trim();
    const qtyVal = parseFloat(editQuantity);

    if (!trimmedSender || !trimmedName || editQuantity === '') {
      setEditError('Fields cannot be empty.');
      return;
    }
    if (isNaN(qtyVal) || qtyVal < 0) {
      setEditError('Must be positive.');
      return;
    }

    // Check duplicate name (excluding itself)
    const duplicate = products.find(p => p.id !== id && p.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) {
      setEditError('Product name exists.');
      return;
    }

    onEditProduct(id, { senderName: trimmedSender, name: trimmedName, quantity: qtyVal });
    setEditingId(null);
  }

  // Filter products (memoized, searching both product name and sender name client-side)
  const filteredProducts = useMemo(() => products.filter(p => {
    const trimmedSearch = search.trim().toLowerCase();
    const matchesSearch = !trimmedSearch ||
      p.name.toLowerCase().includes(trimmedSearch) ||
      (p.senderName && p.senderName.toLowerCase().includes(trimmedSearch));
    const matchesLowStock = filterLowStock ? p.quantity <= 100 : true;
    return matchesSearch && matchesLowStock;
  }), [products, search, filterLowStock]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / 10));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() =>
    filteredProducts.slice((activePage - 1) * 10, activePage * 10)
    , [filteredProducts, activePage]);

  // Export to Excel / CSV
  function handleExportExcel() {
    const headers = ['S/NO', 'Sender Name', 'Product Name', 'Product Quantity'];
    const rows = filteredProducts.map((p, idx) => [
      idx + 1,
      `"${(p.senderName?.trim() || '--').replace(/"/g, '""')}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      p.quantity
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "products_inventory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Copy to Clipboard
  function handleCopy() {
    const headers = 'S/NO\tSender Name\tProduct Name\tProduct Quantity';
    const rows = filteredProducts.map((p, idx) => `${idx + 1}\t${p.senderName?.trim() || '--'}\t${p.name}\t${p.quantity}`).join('\n');
    navigator.clipboard.writeText(headers + '\n' + rows);
    alert('Products table copied to clipboard!');
  }

  // Print / Save PDF
  function handlePrint() {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Inventory Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: sans-serif; padding: 25px; color: #0f172a; }');
    printWindow.document.write('h2 { color: #4f46e5; text-align: center; margin-bottom: 5px; }');
    printWindow.document.write('p { text-align: center; color: #64748b; font-size: 0.9rem; margin-bottom: 20px; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-top: 10px; }');
    printWindow.document.write('th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 0.9rem; }');
    printWindow.document.write('th { background-color: #f8fafc; font-weight: bold; color: #475569; }');
    printWindow.document.write('.low-stock { background-color: #fee2e2; color: #ef4444; font-weight: 500; }');
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<h2>Inventory Report - StoreManager</h2>');
    printWindow.document.write(`<p>Generated on: ${new Date().toLocaleString()}</p>`);
    printWindow.document.write('<table><thead><tr><th>S/NO</th><th>Sender Name</th><th>Product Name</th><th>Product Quantity</th></tr></thead><tbody>');

    filteredProducts.forEach((p, idx) => {
      const isLow = p.quantity <= 100;
      printWindow.document.write(
        `<tr class="${isLow ? 'low-stock' : ''}"><td>${idx + 1}</td><td>${p.senderName?.trim() || '--'}</td><td>${p.name}</td><td>${p.quantity}</td></tr>`
      );
    });

    printWindow.document.write('</tbody></table></body></html>');
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div className="main-layout animate-fade">
      {/* ➕ Add Product Card */}
      <div className="card">
        <div className="card-title">➕ Add New Product</div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleAddSubmit}>
          <div className="add-order-row">
            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Sender Name (e.g. Ali)"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
              />
            </div>
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Product Name (e.g. Sugar)"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                autoComplete="off"
              />

              {showSuggestions && name.trim().length > 0 && (
                <div className="suggestions-dropdown" style={{ top: '100%', left: 0, right: 0 }}>
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map(p => (
                      <div
                        key={p.id}
                        className="suggestion-item"
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevents input blur
                          setName(p.name);
                          setShowSuggestions(false);
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        <span style={{
                          fontSize: '0.75rem',
                          color: p.quantity <= 100 ? 'var(--danger)' : 'var(--text-muted)',
                          fontWeight: p.quantity <= 100 ? 600 : 500
                        }}>
                          (Current Qty: {p.quantity})
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="suggestion-no-match">No product found</div>
                  )}
                </div>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input
                type="number"
                step="any"
                className="form-control"
                placeholder="Quantity (e.g. 55.8)"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">Add Product</button>
          </div>
        </form>
      </div>

      {/* 📄 Products List Card */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>📦 Product Inventory</span>

          {/* Export options */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint}>📄 PDF / Print</button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>📥 Excel</button>
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>📋 Copy</button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Search by product or sender name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
          <button
            type="button"
            className={`btn btn-sm ${filterLowStock ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => { setFilterLowStock(!filterLowStock); setCurrentPage(1); }}
          >
            ⚠️ {filterLowStock ? 'Showing Low Stock Only' : 'Filter Low Stock'}
          </button>
        </div>

        {/* Products Table */}
        {filteredProducts.length === 0 ? (
          <div className="no-records">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 11m8 4V5" />
            </svg>
            <p>No products found.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="records-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>S/No</th>
                    <th>Sender Name</th>
                    <th>Product Name</th>
                    <th>Product Quantity</th>
                    {isAdmin && <th style={{ width: '180px' }}>Edit/Delete</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((p, i) => {
                    const isLowStock = p.quantity <= 100;
                    const isEditing = p.id === editingId;

                    return (
                      <tr
                        key={p.id}
                        className={isLowStock ? "low-stock-row" : ""}
                        style={isLowStock ? { background: '#fef2f2', borderLeft: '4px solid var(--danger)' } : {}}
                      >
                        <td style={{ fontWeight: 600 }}>{(activePage - 1) * 10 + i + 1}</td>

                        {isEditing ? (
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editSenderName}
                              onChange={e => setEditSenderName(e.target.value)}
                              style={{ padding: '0.35rem 0.6rem' }}
                              placeholder="Sender Name"
                            />
                          </td>
                        ) : (
                          <td style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{p.senderName?.trim() || '--'}</td>
                        )}

                        {isEditing ? (
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              style={{ padding: '0.35rem 0.6rem' }}
                              placeholder="Product Name"
                            />
                            {editError && <div style={{ color: 'var(--danger)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{editError}</div>}
                          </td>
                        ) : (
                          <td style={{ fontWeight: 500 }}>{p.name}</td>
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
                          <td style={{ fontWeight: 600, color: isLowStock ? 'var(--danger)' : 'var(--text-main)' }}>
                            {p.quantity} {isLowStock && <span style={{ fontSize: '0.72rem', fontWeight: 600, marginLeft: '0.3rem' }}>(Low Stock)</span>}
                          </td>
                        )}

                        {isAdmin && (
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => saveEdit(p.id)}
                                >
                                  💾 Save
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={cancelEdit}
                                >
                                  ❌ Cancel
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => startEdit(p)}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => { if (window.confirm('Delete this product?')) onDeleteProduct(p.id); }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={activePage}
              totalEntries={filteredProducts.length}
              pageSize={10}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
});
