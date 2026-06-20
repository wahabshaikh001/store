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
  getCountFromServer,
  onSnapshot
} from 'firebase/firestore';
import Pagination from './Pagination';

export default function ApprovedOrders({ user, onDeleteApproved, onDeleteAllApproved }) {
  const isAdmin = user?.role === 'admin';
  const [bookTab, setBookTab] = useState('Large Book');
  const [currentPage, setCurrentPage] = useState(1);
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [largeBookCount, setLargeBookCount] = useState(0);
  const [smallBookCount, setSmallBookCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pageLastDocs = useRef([null]);
  const prevBookTab = useRef(bookTab);
  const unsubRef = useRef(null);
  const activeSubId = useRef(0);

  const totalEntries = bookTab === 'Large Book' ? largeBookCount : smallBookCount;
  const totalPages = Math.max(1, Math.ceil(totalEntries / 10));
  const activePage = Math.min(currentPage, totalPages);

  const fetchCounts = useCallback(async () => {
    try {
      console.log('[Firestore] [ApprovedOrders] Fetching total counts for Large Book and Small Book...');
      const qLarge = query(collection(db, 'approvedOrders'), where('bookType', '==', 'Large Book'));
      const qSmall = query(collection(db, 'approvedOrders'), where('bookType', '==', 'Small Book'));
      const [snapLarge, snapSmall] = await Promise.all([
        getCountFromServer(qLarge),
        getCountFromServer(qSmall)
      ]);
      const lCount = snapLarge.data().count;
      const sCount = snapSmall.data().count;
      console.log(`[Firestore] [ApprovedOrders] Counts fetched. Large Book: ${lCount}, Small Book: ${sCount}`);
      setLargeBookCount(lCount);
      setSmallBookCount(sCount);
      return { 'Large Book': lCount, 'Small Book': sCount };
    } catch (e) {
      console.error("[Firestore] [ApprovedOrders] Error fetching counts:", e);
      return { 'Large Book': 0, 'Small Book': 0 };
    }
  }, []);

  // Subscribe to a scoped real-time listener for the current page
  function subscribePage(targetPage, targetBookTab) {
    const subId = ++activeSubId.current;
    console.log(`[Firestore] [ApprovedOrders] subscribePage called. subId: ${subId}, page: ${targetPage}, bookTab: ${targetBookTab}`);

    // Unsubscribe previous listener
    if (unsubRef.current) {
      console.log(`[Firestore] [ApprovedOrders] Unsubscribing previous listener`);
      unsubRef.current();
      unsubRef.current = null;
    }

    setIsFetching(true);
    setErrorMsg('');

    const pageSize = 10;

    // We need to first resolve the startAfter cursor if needed
    // For page 1, no cursor needed. For later pages, we need the cursor doc.
    const setupListener = async () => {
      try {
        let q;
        if (targetPage === 1) {
          q = query(
            collection(db, 'approvedOrders'),
            where('bookType', '==', targetBookTab),
            orderBy('approvedAt', 'asc'),
            limit(pageSize)
          );
        } else if (pageLastDocs.current[targetPage - 1] !== undefined && pageLastDocs.current[targetPage - 1] !== null) {
          q = query(
            collection(db, 'approvedOrders'),
            where('bookType', '==', targetBookTab),
            orderBy('approvedAt', 'asc'),
            startAfter(pageLastDocs.current[targetPage - 1]),
            limit(pageSize)
          );
        } else {
          // Need to fetch cursor docs first via one-time query
          const cursorQ = query(
            collection(db, 'approvedOrders'),
            where('bookType', '==', targetBookTab),
            orderBy('approvedAt', 'asc'),
            limit((targetPage - 1) * pageSize)
          );
          console.log(`[Firestore] [ApprovedOrders] Fetching cursors up to page ${targetPage} via getDocs`);
          const cursorSnap = await getDocs(cursorQ);
          console.log(`[Firestore] [ApprovedOrders] Fetched cursors. Count: ${cursorSnap.size}`);
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
              collection(db, 'approvedOrders'),
              where('bookType', '==', targetBookTab),
              orderBy('approvedAt', 'asc'),
              startAfter(cursorDocs[cursorDocs.length - 1]),
              limit(pageSize)
            );
          } else {
            // No cursor docs means page is beyond data range
            q = query(
              collection(db, 'approvedOrders'),
              where('bookType', '==', targetBookTab),
              orderBy('approvedAt', 'asc'),
              limit(pageSize)
            );
          }
        }

        if (subId !== activeSubId.current) {
          console.log(`[Firestore] [ApprovedOrders] setupListener aborted (request ${subId} is obsolete, active is ${activeSubId.current})`);
          return;
        }

        console.log(`[Firestore] [ApprovedOrders] Attaching onSnapshot for page ${targetPage}, bookTab: ${targetBookTab}`);
        // Attach real-time listener to the scoped query
        const unsubscribe = onSnapshot(q, (snapshot) => {
          if (subId !== activeSubId.current) {
            console.log(`[Firestore] [ApprovedOrders] onSnapshot update ignored (subId ${subId} is obsolete). Unsubscribing.`);
            unsubscribe();
            return;
          }
          console.log(`[Firestore] [ApprovedOrders] onSnapshot update received for page ${targetPage}: ${snapshot.size} docs`);
          const docs = snapshot.docs;
          const list = docs.map(d => ({ id: d.id, ...d.data() }));
          if (docs.length > 0) {
            pageLastDocs.current[targetPage] = docs[docs.length - 1];
          }
          setApprovedOrders(list);
          setIsFetching(false);
        }, (e) => {
          console.error(`[Firestore] [ApprovedOrders] Error in approved orders listener for page ${targetPage}:`, e);
          if (e.message && e.message.toLowerCase().includes('index')) {
            setErrorMsg('This view requires a Firestore composite index. Please check your developer tools console for the link to create the index, or use the link provided in the implementation plan.');
          } else {
            setErrorMsg('Failed to load records. Please check your network connection.');
          }
          setIsFetching(false);
        });

        unsubRef.current = unsubscribe;

      } catch (e) {
        console.error(`[Firestore] [ApprovedOrders] Error setting up approved orders listener for page ${targetPage}:`, e);
        if (e.message && e.message.toLowerCase().includes('index')) {
          setErrorMsg('This view requires a Firestore composite index. Please check your developer tools console for the link to create the index.');
        } else {
          setErrorMsg('Failed to load records. Please check your network connection.');
        }
        setIsFetching(false);
      }
    };

    setupListener();
  }

  useEffect(() => {
    let targetPage = currentPage;
    if (prevBookTab.current !== bookTab) {
      prevBookTab.current = bookTab;
      pageLastDocs.current = [null];
      setCurrentPage(1);
      targetPage = 1;
    }
    fetchCounts();
    subscribePage(targetPage, bookTab);

    return () => {
      console.log(`[Firestore] [ApprovedOrders] useEffect cleanup. Invalidating active subscription ${activeSubId.current}`);
      activeSubId.current = 0; // invalidate any pending setups
      if (unsubRef.current) {
        console.log(`[Firestore] [ApprovedOrders] Unsubscribing onSnapshot listener`);
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [bookTab, currentPage]);

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
    setApprovedOrders([]);
    setLargeBookCount(0);
    setSmallBookCount(0);
    pageLastDocs.current = [null];
    setCurrentPage(1);
    setConfirmAll(false);
    setLoading(false);
  }

  async function handleSingleDelete(id) {
    if (window.confirm('Delete this approved order?')) {
      setLoading(true);
      await onDeleteApproved(id);
      // Refresh counts and re-subscribe
      pageLastDocs.current.splice(currentPage);
      const newCounts = await fetchCounts();
      const newTotal = bookTab === 'Large Book' ? newCounts['Large Book'] : newCounts['Small Book'];
      const newTotalPages = Math.max(1, Math.ceil(newTotal / 10));
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      } else {
        subscribePage(currentPage, bookTab);
      }
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
            <p>No {bookTab} approved orders yet.</p>
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
}
