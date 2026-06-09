export default function Pagination({ currentPage, totalEntries, pageSize = 10, onPageChange }) {
  const totalPages = Math.ceil(totalEntries / pageSize);

  // If there are no entries, show showing 0 to 0 of 0 entries and return
  if (totalEntries === 0) {
    return (
      <div className="pagination-container">
        <span className="pagination-info">Showing 0 to 0 of 0 entries</span>
        <div className="pagination-buttons">
          <button className="pagination-btn" disabled>
            Previous
          </button>
          <button className="pagination-btn active">1</button>
          <button className="pagination-btn" disabled>
            Next
          </button>
        </div>
      </div>
    );
  }

  const startEntry = (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  // Generate page elements (numbers and ellipsis strings)
  let pages = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      pages = [1, 2, 3, 4, 5, '...', totalPages];
    } else if (currentPage >= totalPages - 2) {
      pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }
  }

  return (
    <div className="pagination-container">
      <span className="pagination-info">
        Showing {startEntry} to {endEntry} of {totalEntries} entries
      </span>
      <div className="pagination-buttons">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>

        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                ...
              </span>
            );
          }
          return (
            <button
              key={page}
              className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          );
        })}

        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
