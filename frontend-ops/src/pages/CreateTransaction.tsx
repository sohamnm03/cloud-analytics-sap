import { useEffect, useState } from "react";
import Header from "../components/Header";
import LoanForm from "../components/LoanForm";
import LoanTable from "../components/LoanTable";
import { fetchTransactionsByFilter } from "../services/api";
import type { Transaction } from "../types/transaction";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CreateTransaction = () => {
  const [data, setData] = useState<Transaction[]>([]);
  const [defaultData, setDefaultData] = useState<Transaction[]>([]);
  const [addedRows, setAddedRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [isEditEnabled, setIsEditEnabled] = useState(false);
  const [isUpdateEnabled, setIsUpdateEnabled] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  // Add this new state at the top
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const loadDefaultTransactions = async () => {
    setLoading(true);
    setPageLoading(true); // ← add this
    try {
      const minimumLoaderDelay = new Promise((resolve) =>
        window.setTimeout(resolve, 450),
      );
      const [rows] = await Promise.all([
        fetchTransactionsByFilter(),
        minimumLoaderDelay,
      ]);
      setDefaultData(rows as Transaction[]);
      setAddedRows([]);
      setData(rows as Transaction[]);
    } finally {
      setLoading(false);
      setPageLoading(false); // ← add this
    }
  };

  useEffect(() => {
    void loadDefaultTransactions();
  }, []);

  const handleSubmit = async (formData: any) => {
    // UPDATE MODE
    if (isEditMode && selectedLoanId) {
      setLoading(true);
      try {
        const amount = Number(formData.LoanAmount || 0);
        const rate = Number(formData.SpotRate || 0);
        const equivInr = (amount * rate).toFixed(2);

        const updatedRow: Transaction = {
          LoanId: selectedLoanId, // ← keep original SAP loan ID
          Bukrs: formData.Bukrs,
          FacilityId: formData.FacilityId,
          ProductType: formData.ProductType,
          TxnType: formData.TxnType,
          StartDate: formData.StartDate,
          EndDate: formData.EndDate,
          LoanAmount: formData.LoanAmount || "0.00",
          BankReference: formData.BankReference || "-",
          LoanCurrency: formData.LoanCurrency || "USD",
          EquivINR: equivInr, // ← recalculate
          SpotRate: formData.SpotRate || "0.0000",
          Status: formData.Status || "P",
          CreatedOn: formData.CreatedOn || "",
          Actions: "View",
        };

        // Update in both data and addedRows
        setData((prev) =>
          prev.map((item) =>
            item.LoanId === selectedLoanId ? updatedRow : item,
          ),
        );

        setDefaultData((prev) =>
          prev.map((item) =>
            item.LoanId === selectedLoanId ? updatedRow : item,
          ),
        );

        setAddedRows((prev) =>
          prev.map((item) =>
            item.LoanId === selectedLoanId ? updatedRow : item,
          ),
        );
      } finally {
        setLoading(false);
      }

      // Reset states
      setIsEditMode(false);
      setIsUpdateEnabled(false);
      setIsEditEnabled(false);
      setSelectedLoanId(null);

      toast.success(`Loan ${selectedLoanId} updated successfully`);
      return;
    }

    // CREATE MODE — stays the same
    setLoading(true);
    try {
      const amount = Number(formData.LoanAmount || 0);
      const rate = Number(formData.SpotRate || 0);
      const equivInr = (amount * rate).toFixed(2);

      const submittedRow: Transaction = {
        LoanId: formData.LoanId,
        Bukrs: formData.Bukrs,
        FacilityId: formData.FacilityId,
        ProductType: formData.ProductType,
        TxnType: formData.TxnType,
        StartDate: formData.StartDate,
        EndDate: formData.EndDate,
        LoanAmount: formData.LoanAmount || "0.00",
        BankReference: formData.BankReference || "-",
        LoanCurrency: formData.LoanCurrency || "USD",
        EquivINR: equivInr,
        SpotRate: formData.SpotRate || "0.0000",
        Status: "P",
        CreatedOn: new Date().toISOString().slice(0, 10),
        Actions: "View",
      };

      setAddedRows((prev) => {
        const updated = [submittedRow, ...prev];
        setData([...updated, ...defaultData]);
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!selectedLoanId) {
      toast.info("Select a transaction row first");
      return;
    }

    setIsEditMode(true);
    setIsUpdateEnabled(true);
    setIsEditEnabled(false);

    toast.info(`Editing ${selectedLoanId} — modify fields then click Update`);
  };

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const selectedLoan = data.find((d) => d.LoanId === selectedLoanId);

  return (
    <div className="app-wrapper" data-theme={theme}>
      {pageLoading && (
        <div className="page-loader-overlay">
          <div className="page-loader-spinner" />
          <p className="page-loader-text">Loading transactions...</p>
        </div>
      )}
      <Header theme={theme} onToggleTheme={handleThemeToggle} />

      <div className="page-title-strip">
        <h1 className="page-title">Create ECB Loan</h1>
        <span className="page-badge">Operational</span>
        <span className="page-version">v2.1.0</span>
      </div>

      <div className="toolbar">
        <button
          className={`tb-btn ${loading ? "loading" : ""}`}
          type="button"
          onClick={() => void loadDefaultTransactions()}
          disabled={loading}
        >
          <svg className="icon-default" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M17.65 6.35A7.96 7.96 0 0012 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
            />
          </svg>
          <span>Refresh</span>
          <span className="btn-spinner" aria-hidden="true" />
        </button>
        <button
          className={`tb-btn primary ${loading ? "loading" : ""}`}
          type="submit"
          form="loan-form"
          disabled={loading}
        >
          <svg className="icon-default" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          <span>Create</span>
          <span className="btn-spinner" aria-hidden="true" />
        </button>
        <div className="tb-sep" role="separator"></div>
        <button
          className="tb-btn"
          type="button"
          disabled={!isEditEnabled}
          onClick={handleEdit}
        >
          <svg viewBox="0 0 24 24" className="icon-default">
            <path
              fill="currentColor"
              d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
            />
          </svg>
          <span>Edit</span>
        </button>
        <button
          className="tb-btn success"
          type="button"
          disabled={!isUpdateEnabled}
          onClick={() => {
            const form = document.getElementById(
              "loan-form",
            ) as HTMLFormElement | null;
            form?.requestSubmit();
          }}
        >
          <svg viewBox="0 0 24 24" className="icon-default">
            <path
              fill="currentColor"
              d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"
            />
          </svg>
          <span>Update</span>
        </button>
      </div>

      <LoanForm
        onSubmit={handleSubmit}
        selectedLoan={selectedLoan}
        isEditMode={isEditMode}
      />

      <LoanTable
        data={data}
        loading={loading}
        selectedLoanId={selectedLoanId}
        onSelectRow={(loanId) => {
          setSelectedLoanId(loanId);
          setIsEditEnabled(true);
          setIsUpdateEnabled(false);
          toast.info(`${loanId} selected. Click Edit to modify.`);
        }}
      />
      <ToastContainer position="top-right" autoClose={3000} />

      <div id="toast-container" aria-live="polite" aria-atomic="true" />
    </div>
  );
};

export default CreateTransaction;
