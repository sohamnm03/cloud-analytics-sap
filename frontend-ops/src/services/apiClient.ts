const username = "FS_dev";
const password = "March@123456789";

const token = btoa(`${username}:${password}`);

export const BASE_URL = "/sap/opu/odata/sap/ZCO_ECB_LOAN_SRV";

export const defaultHeaders = {
  Authorization: `Basic ${token}`,
  Accept: "application/json",
};