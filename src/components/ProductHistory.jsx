import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer
} from 'firebase/firestore';
import Pagination from './Pagination';

export default function ProductHistory({ user, onDeleteHistory, onDeleteAllHistory }) {
  const isAdmin = user?.role === 'admin';
  const [currentPage, setCurrentPage] = useState(1);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pageLastDocs = useRef([null]);
  const activeRequestId = useRef(0);

  const totalPages = Math.max(1, Math.ceil(totalEntries / 10));
  const activePage = Math.min(currentPage, totalPages);

  const fetchCount = useCallback(async () => {
    try {
      console.log('[Firestore] [ProductHistory] Fetching total history count...');
      const q = collection(db, 'productHistory');
      const snap = await getCountFromServer(q);
      const count = snap.data().count;
      console.log(`[Firestore] [ProductHistory] Total count fetched: ${count}`);
      setTotalEntries(count);
      return count;
    } catch (e) {
      console.error("[Firestore] [ProductHistory] Error fetching history count:", e);
      return 0;
    }
  }, []);

  // Fetch a scoped page of product history
  const fetchPageData = useCallback(async (targetPage) => {
    const requestId = ++activeRequestId.current;
    setIsFetching(true);
    setErrorMsg('');
    const pageSize = 10;

    try {
      let q;
      if (targetPage === 1) {
        q = query(
          collection(db, 'productHistory'),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
      } else if (pageLastDocs.current[targetPage - 1] !== undefined && pageLastDocs.current[targetPage - 1] !== null) {
        q = query(
          collection(db, 'productHistory'),
          orderBy('createdAt', 'desc'),
          startAfter(pageLastDocs.current[targetPage - 1]),
          limit(pageSize)
        );
      } else {
        // Need to fetch cursor docs first via one-time query
        const cursorQ = query(
          collection(db, 'productHistory'),
          orderBy('createdAt', 'desc'),
          limit((targetPage - 1) * pageSize)
        );
        console.log(`[Firestore] [ProductHistory] Fetching cursors up to page ${targetPage} via getDocs`);
        const cursorSnap = await getDocs(cursorQ);
        if (requestId !== activeRequestId.current) return;

        console.log(`[Firestore] [ProductHistory] Fetched cursors. Count: ${cursorSnap.size}`);
        const cursorDocs = cursorSnap.docs;
        // Cache intermediate page cursors
        for (let p = 1; p < targetPage; p++) {
          const idx = p * pageSize - 1;
          if (idx < cursorDocs.length) {
            pageLastDocs.current[p] = cursorDocs[idx];
          }
        }
        if (cursorDocs.length > 0) {
          q = query(
            collection(db, 'productHistory'),
            orderBy('createdAt', 'desc'),
            startAfter(cursorDocs[cursorDocs.length - 1]),
            limit(pageSize)
          );
        } else {
          q = query(
            collection(db, 'productHistory'),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
          );
        }
      }

      console.log(`[Firestore] [ProductHistory] Fetching page ${targetPage} via getDocs`);
      const snapshot = await getDocs(q);
      if (requestId !== activeRequestId.current) return;

      console.log(`[Firestore] [ProductHistory] Page data received for page ${targetPage}: ${snapshot.size} docs`);
      const docs = snapshot.docs;
      const list = docs.map(d => ({ id: d.id, ...d.data() }));
      if (docs.length > 0) {
        pageLastDocs.current[targetPage] = docs[docs.length - 1];
      }
      setHistoryRecords(list);
    } catch (e) {
      if (requestId !== activeRequestId.current) return;
      console.error(`[Firestore] [ProductHistory] Error fetching history logs for page ${targetPage}:`, e);
      setErrorMsg('Failed to load history logs. Please check your network connection.');
    } finally {
      if (requestId === activeRequestId.current) {
        setIsFetching(false);
      }
    }
  }, []);

  // Fetch count once on mount
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchCount();
    });
  }, [fetchCount]);

  // Fetch page data when currentPage changes
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchPageData(currentPage);
    });
  }, [currentPage, fetchPageData]);

  const [confirmAll, setConfirmAll] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDeleteAll() {
    if (!confirmAll) {
      setConfirmAll(true);
      return;
    }
    setLoading(true);
    await onDeleteAllHistory();
    setHistoryRecords([]);
    setTotalEntries(0);
    pageLastDocs.current = [null];
    setCurrentPage(1);
    setConfirmAll(false);
    setLoading(false);
  }

  async function handleSingleDelete(id) {
    if (window.confirm('Delete this history record?')) {
      setLoading(true);
      await onDeleteHistory(id);
      pageLastDocs.current.splice(currentPage);
      const newTotal = await fetchCount();
      const newTotalPages = Math.max(1, Math.ceil(newTotal / 10));
      let nextPage = currentPage;
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
        nextPage = newTotalPages;
      }
      fetchPageData(nextPage);
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
            <p>No product history records found.</p>
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
