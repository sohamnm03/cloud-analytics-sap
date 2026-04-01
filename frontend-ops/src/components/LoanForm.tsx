import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  createTransaction,
  fetchCompanyCodesFromSAP,
  fetchFacilities,
  fetchFacilitiesFromSAP,
  fetchFacilityById,
  fetchProductTypesFromSAP,
  fetchTransactionTypesByProductType,
  type CompanyCode,
  type FacilityFromSAP,
  type FormOptionsResponse,
  type ProductType,
} from "../services/api";
import type { Transaction } from "../types/transaction";
import { toast } from "react-toastify";

type Props = {
  onSubmit: (data: any) => void;
  selectedLoan?: Transaction;
  isEditMode: boolean;
};

export type LoanFormHandle = {
  resetForm: () => void;
};

const LoanForm = forwardRef<LoanFormHandle, Props>(
  ({ onSubmit, selectedLoan, isEditMode }, ref) => {
    const [options, setOptions] = useState<FormOptionsResponse>({
      companyCodes: [],
      productTypes: [],
      transactionTypes: [],
      loanCurrencies: [],
      facilities: [],
    });

    const initialForm = {
      Bukrs: "",
      FacilityId: "",
      ProductType: "",
      TxnType: "",
      StartDate: "",
      EndDate: "",
      LoanAmount: "",
      BankReference: "",
      LoanCurrency: "USD",
      SpotRate: "",
      BankName: "",
      FacilityStartDate: "",
      FacilityEndDate: "",
      TotalCreditLine: "0.00",
      AvailableAmount: "0.00",
      FacilityCurrency: "USD",
    };

    const [form, setForm] = useState(initialForm);
    const [facilityOptions, setFacilityOptions] = useState<FacilityFromSAP[]>(
      [],
    );
    const [bukrsSearch, setBukrsSearch] = useState("");
    const [showBukrsDropdown, setShowBukrsDropdown] = useState(false);

    useImperativeHandle(ref, () => ({
      resetForm: () => {
        setForm(initialForm);
        setBukrsSearch("");
      },
    }));

    useEffect(() => {
  const loadOptions = async () => {
    try {
      const [sapCompanyCodes, sapProductTypes] = await Promise.all([
        fetchCompanyCodesFromSAP(),
        fetchProductTypesFromSAP(),
      ]);

      setOptions({
        companyCodes: sapCompanyCodes,
        productTypes: sapProductTypes,
        transactionTypes: [],
        loanCurrencies: ["USD", "INR"], // 🔹 temporary static
        facilities: [], // 🔹 not used anymore
      });
    } catch (err) {
      console.error("Error loading form options", err);
    }
  };

  void loadOptions();
}, []);

    useEffect(() => {
      if (selectedLoan && isEditMode) {
        const matched = options.companyCodes.find(
          (c) => c.bukrs === selectedLoan.Bukrs,
        );
        setBukrsSearch(
          matched
            ? `${matched.bukrs} - ${matched.butxt}`
            : selectedLoan.Bukrs || "",
        );
        setForm({
          Bukrs: selectedLoan.Bukrs || "",
          FacilityId: selectedLoan.FacilityId || "",
          ProductType: selectedLoan.ProductType || "",
          TxnType: selectedLoan.TxnType || "",
          StartDate: selectedLoan.StartDate || "",
          EndDate: selectedLoan.EndDate || "",
          LoanAmount: selectedLoan.LoanAmount || "",
          BankReference: selectedLoan.BankReference || "",
          LoanCurrency: selectedLoan.LoanCurrency || "USD",
          SpotRate: selectedLoan.SpotRate || "",
          BankName: "",
          FacilityStartDate: "",
          FacilityEndDate: "",
          TotalCreditLine: "0.00",
          AvailableAmount: "0.00",
          FacilityCurrency: "USD",
        });
      }
    }, [selectedLoan, isEditMode, options.companyCodes]);

    // const facilityOptions = useMemo(
    //   () => options.facilities.filter((item) => item.Bukrs === form.Bukrs),
    //   [options.facilities, form.Bukrs],
    // );

    useEffect(() => {
      const selectedFacilityStillValid = facilityOptions.some(
        (item) => item.FacilityId === form.FacilityId,
      );

      if (!selectedFacilityStillValid) {
        setForm((prev) => ({
          ...prev,
          FacilityId: "",
          BankName: "",
          FacilityStartDate: "",
          FacilityEndDate: "",
          TotalCreditLine: "0.00",
          AvailableAmount: "0.00",
          FacilityCurrency: "USD",
        }));
      }
    }, [facilityOptions, form.FacilityId]);

    useEffect(() => {
      if (!form.Bukrs) {
        setFacilityOptions([]);
        setForm((prev) => ({ ...prev, FacilityId: "" }));
        return;
      }

      const loadFacilities = async () => {
        const facilities = await fetchFacilitiesFromSAP(form.Bukrs); // use the function that returns only FacilityFromSAP[]
        setFacilityOptions(facilities);
      };

      void loadFacilities();
    }, [form.Bukrs]);

    useEffect(() => {
      if (!form.Bukrs || !form.FacilityId) return;

      const loadFacilityDetails = async () => {
        const facility = await fetchFacilities(form.Bukrs, form.FacilityId);
        if (!facility) return;

        //  Type guard to ensure facility is a single object
        if (!Array.isArray(facility)) {
          setForm((prev) => ({
            ...prev,
            BankName: facility.BankName,
            FacilityStartDate: facility.FacilityStartDate,
            FacilityEndDate: facility.FacilityEndDate,
            TotalCreditLine: facility.TotalCreditLine,
            AvailableAmount: facility.AvailableAmount,
            FacilityCurrency: facility.FacilityCurrency,
          }));
        }
      };

      void loadFacilityDetails();
    }, [form.Bukrs, form.FacilityId]);

    useEffect(() => {
      const loadTransactionTypes = async () => {
        if (!form.ProductType) {
          setOptions((prev) => ({ ...prev, transactionTypes: [] }));
          setForm((prev) => ({ ...prev, TxnType: "" }));
          return;
        }

        try {
          const txnTypes = await fetchTransactionTypesByProductType(
            form.ProductType,
          );
          console.log(
            "Fetched transaction types for product",
            form.ProductType,
            ":",
            txnTypes,
          );
          setOptions((prev) => ({
            ...prev,
            transactionTypes: txnTypes, // now objects
          }));

          setForm((prev) => ({ ...prev, TxnType: "" })); // reset selection
        } catch (err) {
          console.error("Failed to load transaction types", err);
        }
      };

      void loadTransactionTypes();
    }, [form.ProductType]);

    const handleChange = (
      e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
      setForm({ ...form, [e.target.name]: e.target.value });
    };

    const calcEquivINR = () => {
      const amount = Number(form.LoanAmount || 0);
      const rate = Number(form.SpotRate || 0);
      return (amount * rate).toFixed(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        const sapLoanID = await createTransaction(form);
        // alert("Transaction created successfully!");
        toast.success("Transaction created successfully!");
        onSubmit({ ...form, LoanId: sapLoanID });
      } catch (err: any) {
        console.error(err.message);
      }
    };

    return (
      <form className="form-panel" onSubmit={handleSubmit} id="loan-form">
        <div className="form-section">
          <div className="section-head">
            <div className="section-head-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
              </svg>
            </div>
            <h3 className="section-title">Facility Details</h3>
          </div>

          <div className="section-body">
            <div className="form-row">
              <label className="field-label" htmlFor="bukrs">
                Co Code <span className="req">*</span>
              </label>
              <div className="searchable-select-wrap">
                <input
                  id="bukrs"
                  className="field-input"
                  placeholder="Search company code..."
                  value={bukrsSearch}
                  onChange={(e) => {
                    setBukrsSearch(e.target.value);
                    setShowBukrsDropdown(e.target.value.length > 0);
                    // setShowBukrsDropdown(true);
                    if (!e.target.value) {
                      setForm((prev) => ({ ...prev, Bukrs: "" }));
                    }
                  }}
                  onBlur={() =>
                    window.setTimeout(() => setShowBukrsDropdown(false), 200)
                  }
                  autoComplete="off"
                />
                {showBukrsDropdown && (
                  <ul className="searchable-dropdown">
                    {options.companyCodes
                      .filter((item) =>
                        `${item.bukrs} ${item.butxt}`
                          .toLowerCase()
                          .includes(bukrsSearch.toLowerCase()),
                      )
                      .map((item) => (
                        <li
                          key={item.bukrs}
                          className="searchable-dropdown-item"
                          onMouseDown={() => {
                            setBukrsSearch(`${item.bukrs} - ${item.butxt}`);
                            setForm((prev) => ({ ...prev, Bukrs: item.bukrs }));
                            setShowBukrsDropdown(false);
                          }}
                        >
                          {item.bukrs} - {item.butxt}
                        </li>
                      ))}
                    {options.companyCodes.filter((item) =>
                      `${item.bukrs} ${item.butxt}`
                        .toLowerCase()
                        .includes(bukrsSearch.toLowerCase()),
                    ).length === 0 && (
                      <li className="searchable-dropdown-empty">
                        No results found
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="form-row">
              <label className="field-label" htmlFor="facilityId">
                Facility ID <span className="req">*</span>
              </label>
              <select
                id="facilityId"
                className="field-select"
                name="FacilityId"
                value={form.FacilityId}
                onChange={handleChange}
                required
                disabled={!form.Bukrs || facilityOptions.length === 0}
              >
                <option value="">Select Facility</option>
                {facilityOptions.map((item) => (
                  <option key={item.FacilityId} value={item.FacilityId}>
                    {item.FacilityId}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label className="field-label" htmlFor="bankName">
                Bank Name
              </label>
              <input
                id="bankName"
                className="field-input"
                name="BankName"
                placeholder="Auto-populated from SAP"
                value={form.BankName}
                readOnly
                tabIndex={-1}
              />
            </div>

            {/* Facility Start Date */}
            <div className="form-row">
              <label className="field-label" htmlFor="facilityStartDate">
                Facility Start Date
              </label>
              <input
                id="facilityStartDate"
                className="field-input"
                name="FacilityStartDate"
                type="date"
                value={form.FacilityStartDate}
                readOnly
                tabIndex={-1}
              />
            </div>

            {/* Facility End Date */}
            <div className="form-row">
              <label className="field-label" htmlFor="facilityEndDate">
                Facility End Date
              </label>
              <input
                id="facilityEndDate"
                className="field-input"
                name="FacilityEndDate"
                type="date"
                value={form.FacilityEndDate}
                readOnly
                tabIndex={-1}
              />
            </div>

            {/* Total Credit Line */}
            <div className="form-row currency">
              <label className="field-label" htmlFor="totalCreditLine">
                Total Credit Line
              </label>
              <input
                id="totalCreditLine"
                className="field-input-num"
                name="TotalCreditLine"
                value={form.TotalCreditLine}
                readOnly
                tabIndex={-1}
              />
              <input
                className="field-curr"
                value={form.FacilityCurrency}
                readOnly
                tabIndex={-1}
              />
            </div>

            {/* Available Amount */}
            <div className="form-row currency">
              <label className="field-label" htmlFor="availableAmount">
                Available Amount
              </label>
              <input
                id="availableAmount"
                className="field-input-num"
                name="AvailableAmount"
                value={form.AvailableAmount}
                readOnly
                tabIndex={-1}
              />
              <input
                className="field-curr"
                value={form.FacilityCurrency}
                readOnly
                tabIndex={-1}
              />
            </div>

            {/* Facility Currency */}
            <div className="form-row">
              <label className="field-label" htmlFor="facilityCurrency">
                Facility Currency
              </label>
              <input
                id="facilityCurrency"
                className="field-input"
                name="FacilityCurrency"
                value={form.FacilityCurrency}
                readOnly
                tabIndex={-1}
                style={{
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-head">
            <div className="section-head-icon">
              <svg viewBox="0 0 24 24">
                <path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-2 0H3V6h14v8zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm13 0v11c0 1.1-.9 2-2 2H4v-2h17V7h2z" />
              </svg>
            </div>
            <h3 className="section-title">Loan Details</h3>
          </div>

          <div className="section-body">
            <div className="form-row">
              <label className="field-label" htmlFor="productType">
                Product Type <span className="req">*</span>
              </label>
              <select
                id="productType"
                className="field-select"
                name="ProductType"
                value={form.ProductType}
                onChange={handleChange}
                required
              >
                <option value="">Select Product</option>
                {options.productTypes.map((item) => (
                  <option key={item.PRODUCT_TYPE} value={item.PRODUCT_TYPE}>
                    {item.PRODUCT_TYPE} - {item.PrdTypeDesc}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label className="field-label" htmlFor="txnType">
                Txn Type <span className="req">*</span>
              </label>
              <select
                id="txnType"
                className="field-select"
                name="TxnType"
                value={form.TxnType}
                onChange={handleChange}
                required
                disabled={
                  !form.ProductType || options.transactionTypes.length === 0
                }
              >
                <option value="">Select Transaction</option>
                {options.transactionTypes.map((t, index) => (
                  <option key={`${t.TXN_TYPE}-${index}`} value={t.TXN_TYPE}>
                    {t.TXN_TYPE && t.TXN_TYPE_desc
                      ? `${t.TXN_TYPE} - ${t.TXN_TYPE_desc}`
                      : t.TXN_TYPE_desc || t.TXN_TYPE || "Unknown"}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label className="field-label" htmlFor="startDate">
                Start Date <span className="req">*</span>
              </label>
              <input
                id="startDate"
                className="field-input"
                type="date"
                name="StartDate"
                value={form.StartDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <label className="field-label" htmlFor="endDate">
                End Date
              </label>
              <input
                id="endDate"
                className="field-input"
                type="date"
                name="EndDate"
                value={form.EndDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-row currency">
              <label className="field-label" htmlFor="loanAmount">
                Loan Amount
              </label>
              <input
                id="loanAmount"
                className="field-input-num"
                name="LoanAmount"
                placeholder="0.00"
                value={form.LoanAmount}
                onChange={handleChange}
              />
              <input
                className="field-curr"
                name="LoanCurrency"
                value={form.LoanCurrency}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className="form-row">
              <label className="field-label" htmlFor="loanCurrency">
                Loan Currency
              </label>
              <select
                id="loanCurrency"
                className="field-select"
                name="LoanCurrency"
                value={form.LoanCurrency}
                onChange={handleChange}
              >
                <option value="">Select Currency</option>
                {options.loanCurrencies.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label className="field-label" htmlFor="bankRef">
                Bank Reference
              </label>
              <input
                id="bankRef"
                className="field-input"
                name="BankReference"
                placeholder="Bank deal / reference number"
                value={form.BankReference}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <label className="field-label" htmlFor="spotRate">
                Spot Rate
              </label>
              <input
                id="spotRate"
                className="field-input"
                name="SpotRate"
                placeholder="0.0000"
                value={form.SpotRate}
                onChange={handleChange}
              />
            </div>

            <div className="form-row currency">
              <label className="field-label" htmlFor="loanAmount">
                Equivalent INR
              </label>
              <input
                id="equivInr"
                className="field-input-num"
                value={calcEquivINR()}
                readOnly
              />
              <input className="field-curr" value="INR" readOnly />
            </div>
          </div>
        </div>
      </form>
    );
  },
);

export default LoanForm;
