import { useEffect, useState } from "react";
import type { Transaction } from "../types/transaction";

type Props = {
  data: Transaction[];
  loading?: boolean;
  onSelectRow: (loanId: string) => void;
  selectedLoanId: string | null;
};

const LoanTable = ({
  data,
  loading = false,
  onSelectRow,
  selectedLoanId,
}: Props) => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof Transaction>("StartDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const filteredData = [...data]
    .filter((item) =>
      Object.values(item).some((val) =>
        String(val ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    )
    .sort((a, b) => {
      const aVal = String(a[sortBy] ?? "");
      const bVal = String(b[sortBy] ?? "");

      if (sortDirection === "asc") {
        return aVal.localeCompare(bVal, undefined, { numeric: true });
      }

      return bVal.localeCompare(aVal, undefined, { numeric: true });
    });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const onSort = (column: keyof Transaction) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };

  const statusClass = (status?: string) => {
    const value = String(status ?? "NEW").toUpperCase();
    if (value.includes("ACTIVE") || value.includes("NEW"))
      return "badge-active";
    if (value.includes("PENDING")) return "badge-pending";
    if (value.includes("MATURED")) return "badge-matured";
    if (value.includes("CANCEL")) return "badge-cancelled";
    return "badge-pending";
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="table-card">
      <div className="table-head-bar">
        <div className="table-head-left">
          <div className="table-head-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z" />
            </svg>
          </div>
          <div className="table-title">ECB Loan Transactions</div>
          <div className="table-count">{filteredData.length}</div>
        </div>

        <div className="tbl-search-wrap">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z" />
          </svg>
          <input
            className="tbl-search"
            placeholder="Search transactions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-scroll">
        <table className="ecb-table">
          <thead>
            <tr>
              <th onClick={() => onSort("LoanId")}>Loan ID</th>
              <th onClick={() => onSort("Bukrs")}>Co Code</th>
              <th onClick={() => onSort("FacilityId")}>Facility ID</th>
              <th onClick={() => onSort("ProductType")}>Product</th>
              <th onClick={() => onSort("TxnType")}>Txn Type</th>
              <th onClick={() => onSort("StartDate")}>Start Date</th>
              <th onClick={() => onSort("EndDate")}>End Date</th>
              <th className="num" onClick={() => onSort("LoanAmount")}>
                Loan Amount
              </th>
              <th onClick={() => onSort("BankReference")}>Bank Reference</th>
              <th onClick={() => onSort("LoanCurrency")}>Curr</th>
              <th className="num" onClick={() => onSort("EquivINR")}>
                Equiv INR
              </th>
              <th className="num" onClick={() => onSort("SpotRate")}>
                Spot Rate
              </th>
              <th onClick={() => onSort("Status")}>Status</th>
              <th onClick={() => onSort("CreatedOn")}>Created On</th>
              <th onClick={() => onSort("Actions")}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={15}>
                  <div className="tbl-loader">
                    <div className="tbl-loader-spinner" aria-hidden="true" />
                    <p>Fetching transactions...</p>
                    <span>Loading from mock transaction API</span>
                    <div className="tbl-loader-skeleton" aria-hidden="true">
                      <div className="skeleton-line" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line" />
                    </div>
                  </div>
                </td>
              </tr>
            ) : filteredData.length > 0 ? (
              paginatedData.map((item, index) => (
                <tr
                  key={`${item.FacilityId}-${currentPage}-${index}`}
                  data-loan-id={item.LoanId} // <-- Add this
                  style={{
                    background:
                      selectedLoanId === item.LoanId ? "var(--blue-pale)" : "", // <-- Highlight selected row
                  }}
                >
                  <td>{item.LoanId || "-"}</td>

                  <td>{item.Bukrs}</td>
                  <td>{item.FacilityId}</td>
                  <td>{item.ProductType}</td>
                  <td>{item.TxnType}</td>
                  <td>{item.StartDate}</td>
                  <td>{item.EndDate || "-"}</td>
                  <td className="num">{item.LoanAmount || "0"}</td>
                  <td>{item.BankReference || "-"}</td>
                  <td>{item.LoanCurrency}</td>
                  <td className="num">{item.EquivINR || "0.00"}</td>
                  <td className="num">{item.SpotRate || "0.0000"}</td>
                  <td>
                    <span
                      className={`status-badge ${statusClass(item.Status)}`}
                    >
                      {item.Status || "NEW"}
                    </span>
                  </td>
                  <td>{item.CreatedOn || "-"}</td>
                  <td>
                    <button
                      className="tb-btn"
                      type="button"
                      onClick={() => onSelectRow(item.LoanId)}
                    >
                      <svg viewBox="0 0 24 24" className="icon-default">
                        <path
                          fill="currentColor"
                          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                        />
                      </svg>
                      <span>Select</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={15}>
                  <div className="tbl-empty">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z" />
                    </svg>
                    <p>No transactions found</p>
                    <span>
                      Use the form above to create your first loan transaction.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="tbl-info">
          {loading
            ? "Fetching records..."
            : `Showing ${filteredData.length} of ${data.length} records`}
        </div>
        <div className="tbl-pagination">
          {/* LEFT ARROW */}
          <button
            className="page-btn"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            ←
          </button>

          {/* PAGE INFO */}
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>

          {/* RIGHT ARROW */}
          <button
            className="page-btn"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanTable;
