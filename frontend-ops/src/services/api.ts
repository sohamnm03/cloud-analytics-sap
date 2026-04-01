import type { Transaction } from "../types/transaction";
import { get, postWithCsrf } from "./sapService";

/* ===================== TYPES ===================== */

export type FacilityInfo = {
  Bukrs: string;
  FacilityId: string;
  BankName: string;
  FacilityStartDate: string;
  FacilityEndDate: string;
  TotalCreditLine: string;
  AvailableAmount: string;
  FacilityCurrency: string;
};

export type FormOptionsResponse = {
  companyCodes: CompanyCode[];
  productTypes: ProductType[];
  transactionTypes: TransactionType[];
  loanCurrencies: string[];
  facilities: FacilityInfo[];
};

export type FacilityFromSAP = {
  Bukrs: string;
  FacilityId: string;
};

export type TransactionFilter = {
  Bukrs?: string;
  FacilityId?: string;
  ProductType?: string;
  TxnType?: string;
  StartDate?: string;
  EndDate?: string;
};

export type CompanyCode = {
  bukrs: string;
  butxt: string;
};

export type ProductType = {
  PRODUCT_TYPE: string;
  PrdTypeDesc: string;
};

export type TransactionType = {
  TXN_TYPE: string;
  TXN_TYPE_desc: string;
};

/* ===================== MOCK ===================== */

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return (await response.json()) as T;
};

export const fetchFormOptions = async (): Promise<FormOptionsResponse> => {
  return fetchJson<FormOptionsResponse>("/mocks/form-options.json");
};

/* ===================== APIs ===================== */

//  Company Codes
export const fetchCompanyCodesFromSAP = async (): Promise<CompanyCode[]> => {
  const data: any = await get("/cocodeSet/?$format=json");

  return data.d.results.map((item: any) => ({
    bukrs: item.bukrs,
    butxt: item.butxt,
  }));
};

//  Facility from mock
export const fetchFacilityById = async (
  bukrs: string,
  facilityId: string,
): Promise<FacilityInfo | null> => {
  const formOptions = await fetchFormOptions();

  const facility = formOptions.facilities.find(
    (item) => item.Bukrs === bukrs && item.FacilityId === facilityId,
  );

  return facility ?? null;
};

//  Product Types
export const fetchProductTypesFromSAP = async (): Promise<ProductType[]> => {
  const data: any = await get("/PrdTypeSet/?$format=json");

  return data.d.results.map((item: any) => ({
    PRODUCT_TYPE: item.PRODUCT_TYPE,
    PrdTypeDesc: item.PrdTypeDesc || "",
  }));
};

//  Transactions
export const fetchTransactionsByFilter = async (): Promise<Transaction[]> => {
  const data: any = await get(
    "/ECBLoanSet/?$filter=BUKRS eq '1000'&$format=json",
  );

  return data.d.results.map((p: any) => ({
    LoanId: p.LOAN_ID,
    Bukrs: p.BUKRS,
    FacilityId: p.FACILITY_ID || "",
    ProductType: p.PRODUCT_TYPE || "",
    TxnType: p.TXN_TYPE || "",
    StartDate: p.START_DATE?.slice(0, 10),
    EndDate: p.END_DATE?.slice(0, 10),
    LoanAmount: p.LOAN_AMOUNT || "0",
    BankReference: p.BANK_REF || "-",
    LoanCurrency: p.LOAN_CURRENCY || "USD",
    EquivINR: p.EQUIV_INR || "0",
    SpotRate: p.SPOT_RATE || "0",
    Status: p.STATUS || "NEW",
    CreatedOn: p.CREATED_on?.slice(0, 10) || "",
    Actions: "View",
  }));
};

//  Facilities list
export const fetchFacilitiesFromSAP = async (
  bukrs: string,
): Promise<FacilityFromSAP[]> => {
  if (!bukrs) return [];

  const data: any = await get(
    `/FacDetailsSet?$filter=Bukrs eq '${bukrs}'&$format=json`,
  );

  return data.d.results.map((item: any) => ({
    Bukrs: item.Bukrs,
    FacilityId: item.Rfha,
  }));
};

//  Facilities (list + single)
export const fetchFacilities = async (
  bukrs: string,
  facilityId?: string,
): Promise<FacilityInfo | FacilityFromSAP[] | null> => {
  if (!bukrs) return facilityId ? null : [];

  // 🔹 Single Facility
  if (facilityId) {
    const data: any = await get(
      `/FacilitySet(Bukrs='${bukrs}',FacilityId='${facilityId}')`,
    );

    const d = data.d;
    if (!d) return null;

    return {
      Bukrs: d.Bukrs,
      FacilityId: d.FacilityId,
      BankName: d.BankName || "",
      FacilityStartDate: d.FacilityStartDate || "",
      FacilityEndDate: d.FacilityEndDate || "",
      TotalCreditLine: d.TotalCreditLine || "0.00",
      AvailableAmount: d.AvailableAmount || "0.00",
      FacilityCurrency: d.FacilityCurrency || "USD",
    };
  }

  // 🔹 Facility List
  const data: any = await get(
    `/FacDetailsSet?$filter=Bukrs eq '${bukrs}'&$format=json`,
  );

  return (
    data.d?.results?.map((item: any) => ({
      Bukrs: item.Bukrs,
      FacilityId: item.Rfha,
    })) || []
  );
};

//  Transaction Types
export const fetchTransactionTypesByProductType = async (
  productType: string,
): Promise<TransactionType[]> => {
  const data: any = await get(
    `/TxnTypeSet/?$filter=PRODUCT_TYPE eq '${productType}'&$format=json`,
  );

  return data.d.results.map((t: any) => ({
    TXN_TYPE: t.TXN_TYPE,
    TXN_TYPE_desc: t.TXN_TYPE_desc,
  }));
};

//  CREATE Transaction (CSRF handled centrally)
export const createTransaction = async (formData: any): Promise<string> => {
  const payload = {
    BUKRS: formData.Bukrs,
    LOAN_ID: formData.LoanId || "",
    FACILITY_ID: formData.FacilityId,
    PRODUCT_TYPE: formData.ProductType,
    TXN_TYPE: formData.TxnType,
    START_DATE: formData.StartDate.replaceAll("-", ""),
    END_DATE: formData.EndDate.replaceAll("-", ""),
    LOAN_AMOUNT: formData.LoanAmount || "0.00",
    LOAN_CURRENCY: formData.LoanCurrency || "",
    BANK_REF: formData.BankReference || "",
    SPOT_RATE: formData.SpotRate || "0.00000",
    EQUIV_INR: formData.EquivINR || "0.00",
    STATUS: formData.Status || "",
    CREATED_on: formData.CreatedOn || "",
  };

  const data: any = await postWithCsrf("/ECBLoanSet", payload);

  return data.d.LOAN_ID;
};
