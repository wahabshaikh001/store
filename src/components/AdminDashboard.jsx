export default function AdminDashboard({ records, onApproveRecord }) {
  return (
    <div className="main-layout animate-fade">
      <div className="card">
        <div className="card-title">🛡️ Pending Orders — Admin Approval</div>

        {records.length === 0 ? (
          <div className="no-records">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>All orders approved! Nothing pending.</p>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.datetime}</td>
                    <td style={{ fontWeight: 500 }}>{r.order}</td>
                    <td><span className="badge badge-pending">pending</span></td>
                    <td>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => onApproveRecord(r.id)}
                      >
                        ✔ Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
