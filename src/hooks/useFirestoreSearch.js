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

export function useFirestoreSearch({
  collectionName,
  orderByField,
  orderDirection = 'asc',
  pageSize = 10,
  filterField = 'productName',
  extraFilters = []
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [records, setRecords] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pageLastDocs = useRef([null]);
  const lastFetchedParams = useRef({ page: null, query: null, extraFiltersKey: null });
  const lastFetchedCountParams = useRef({ query: null, extraFiltersKey: null });
  const activeRequestId = useRef(0);

  const extraFiltersKey = JSON.stringify(extraFilters);

  // Query builder helper
  const buildBaseQuery = useCallback((searchVal) => {
    let q = collection(db, collectionName);
    
    // Apply extra filters
    const parsedFilters = JSON.parse(extraFiltersKey);
    parsedFilters.forEach(f => {
      q = query(q, where(f.field, f.operator, f.value));
    });

    // Apply search filter if present
    if (searchVal && searchVal.trim()) {
      q = query(q, where(filterField, '==', searchVal.trim()));
    }

    return q;
  }, [collectionName, filterField, extraFiltersKey]);

  const fetchCount = useCallback(async () => {
    try {
      console.log(`[Firestore] [${collectionName}] Fetching count...`);
      const baseQ = buildBaseQuery(appliedSearchQuery);
      const snap = await getCountFromServer(baseQ);
      const count = snap.data().count;
      setTotalEntries(count);
      return count;
    } catch (e) {
      console.error(`[Firestore] [${collectionName}] Error fetching count:`, e);
      if (e.message && e.message.toLowerCase().includes('index')) {
        setErrorMsg('This view requires a Firestore composite index. Please check your developer tools console for the link to create the index.');
      }
      return 0;
    }
  }, [collectionName, buildBaseQuery, appliedSearchQuery]);

  const fetchPageData = useCallback(async (targetPage) => {
    const requestId = ++activeRequestId.current;
    setIsFetching(true);
    setErrorMsg('');

    try {
      const baseQuery = buildBaseQuery(appliedSearchQuery);
      let q;
      if (targetPage === 1) {
        q = query(
          baseQuery,
          orderBy(orderByField, orderDirection),
          limit(pageSize)
        );
      } else if (pageLastDocs.current[targetPage - 1] !== undefined && pageLastDocs.current[targetPage - 1] !== null) {
        q = query(
          baseQuery,
          orderBy(orderByField, orderDirection),
          startAfter(pageLastDocs.current[targetPage - 1]),
          limit(pageSize)
        );
      } else {
        // Fetch cursors if page gap exists
        const cursorQ = query(
          baseQuery,
          orderBy(orderByField, orderDirection),
          limit((targetPage - 1) * pageSize)
        );
        console.log(`[Firestore] [${collectionName}] Fetching cursors up to page ${targetPage}`);
        const cursorSnap = await getDocs(cursorQ);
        if (requestId !== activeRequestId.current) return;

        const cursorDocs = cursorSnap.docs;
        for (let p = 1; p < targetPage; p++) {
          const idx = p * pageSize - 1;
          if (idx < cursorDocs.length) {
            pageLastDocs.current[p] = cursorDocs[idx];
          }
        }
        
        if (cursorDocs.length > 0) {
          q = query(
            baseQuery,
            orderBy(orderByField, orderDirection),
            startAfter(cursorDocs[cursorDocs.length - 1]),
            limit(pageSize)
          );
        } else {
          q = query(
            baseQuery,
            orderBy(orderByField, orderDirection),
            limit(pageSize)
          );
        }
      }

      console.log(`[Firestore] [${collectionName}] Fetching page ${targetPage} records...`);
      const snapshot = await getDocs(q);
      if (requestId !== activeRequestId.current) return;

      const docs = snapshot.docs;
      const list = docs.map(d => ({ id: d.id, ...d.data() }));
      if (docs.length > 0) {
        pageLastDocs.current[targetPage] = docs[docs.length - 1];
      }
      setRecords(list);
    } catch (e) {
      if (requestId !== activeRequestId.current) return;
      console.error(`[Firestore] [${collectionName}] Error fetching page ${targetPage}:`, e);
      if (e.message && e.message.toLowerCase().includes('index')) {
        setErrorMsg('This view requires a Firestore composite index. Please check your developer tools console for the link to create the index.');
      } else {
        setErrorMsg('Failed to load records. Please check your network connection.');
      }
    } finally {
      if (requestId === activeRequestId.current) {
        setIsFetching(false);
      }
    }
  }, [collectionName, buildBaseQuery, appliedSearchQuery, orderByField, orderDirection, pageSize]);

  // Handle count loading when query or extra filters change
  useEffect(() => {
    if (
      lastFetchedCountParams.current.query === appliedSearchQuery &&
      lastFetchedCountParams.current.extraFiltersKey === extraFiltersKey
    ) {
      return;
    }
    lastFetchedCountParams.current = { query: appliedSearchQuery, extraFiltersKey };
    pageLastDocs.current = [null];
    fetchCount();
  }, [appliedSearchQuery, extraFiltersKey, fetchCount]);

  // Handle page data loading when page/query/filters change
  useEffect(() => {
    const isParamChanged =
      lastFetchedParams.current.query !== appliedSearchQuery ||
      lastFetchedParams.current.extraFiltersKey !== extraFiltersKey;

    if (isParamChanged) {
      pageLastDocs.current = [null];
      if (currentPage !== 1) {
        return; // The currentPage change will trigger the next run
      }
    }

    if (
      lastFetchedParams.current.page === currentPage &&
      lastFetchedParams.current.query === appliedSearchQuery &&
      lastFetchedParams.current.extraFiltersKey === extraFiltersKey
    ) {
      return;
    }

    lastFetchedParams.current = { page: currentPage, query: appliedSearchQuery, extraFiltersKey };
    fetchPageData(currentPage);
  }, [currentPage, appliedSearchQuery, extraFiltersKey, fetchPageData]);

  const executeSearch = useCallback((queryText) => {
    const trimmed = (queryText || '').trim();
    if (appliedSearchQuery !== trimmed) {
      setAppliedSearchQuery(trimmed);
      setSearchQuery(trimmed);
      setCurrentPage(1);
    }
  }, [appliedSearchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setAppliedSearchQuery('');
    setCurrentPage(1);
  }, []);

  // Force re-fetch (useful after delete/update operations)
  const forceRefetch = useCallback(async () => {
    pageLastDocs.current.splice(currentPage);
    const newTotal = await fetchCount();
    const newTotalPages = Math.max(1, Math.ceil(newTotal / pageSize));
    let nextPage = currentPage;
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages);
      nextPage = newTotalPages;
    }
    await fetchPageData(nextPage);
  }, [currentPage, fetchCount, fetchPageData, pageSize]);

  return {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    appliedSearchQuery,
    records,
    setRecords,
    totalEntries,
    setTotalEntries,
    isFetching,
    errorMsg,
    setErrorMsg,
    executeSearch,
    clearSearch,
    forceRefetch
  };
}
