export default function Navbar({ user, activeTab, setActiveTab, onChangePassword, onLogout }) {
  const isAdmin = user?.role === 'admin';

  return (
    <nav className="app-navbar">
      <div className="navbar-container">
        <div className="navbar-brand">🛒 StoreManager</div>

        <div className="navbar-nav">
          {isAdmin ? (
            <>
              <button
                className={`nav-link ${activeTab === 'products' ? 'active' : ''}`}
                onClick={() => setActiveTab('products')}
              >
                Products
              </button>
              <button
                className={`nav-link ${activeTab === 'records' ? 'active' : ''}`}
                onClick={() => setActiveTab('records')}
              >
                Orders
              </button>
            </>
          ) : (
            <>
              <button
                className={`nav-link ${activeTab === 'products' ? 'active' : ''}`}
                onClick={() => setActiveTab('products')}
              >
                Products
              </button>
              <button
                className={`nav-link ${activeTab === 'add' ? 'active' : ''}`}
                onClick={() => setActiveTab('add')}
              >
                Add Order
              </button>
              <button
                className={`nav-link ${activeTab === 'records' ? 'active' : ''}`}
                onClick={() => setActiveTab('records')}
              >
                My Orders
              </button>
            </>
          )}
        </div>

        <div className="navbar-actions">
          <span className={`user-badge ${isAdmin ? 'admin-badge' : ''}`}>
            {isAdmin ? '🛡️ Admin' : '🧑‍💼 Sales'}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={onChangePassword}>
            Change Password
          </button>
          <button className="btn btn-danger btn-sm" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
