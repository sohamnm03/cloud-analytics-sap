export type Transaction = {
  LoanId: string;
  Bukrs: string;
  FacilityId: string;
  ProductType: string;
  TxnType: string;
  StartDate: string;
  EndDate?: string;
  LoanAmount: string;
  BankReference: string;
  LoanCurrency: string;
  EquivINR?: string;
  SpotRate?: string;
  Status?: string;
  CreatedOn?: string;
  Actions?: string;
};