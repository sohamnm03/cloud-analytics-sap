import { BASE_URL, defaultHeaders } from "./apiClient";
import { request } from "./apiService";

// ✅ GET helper
export const get = <T>(endpoint: string) =>
  request<T>(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: defaultHeaders,
  });

// ✅ POST with CSRF
export const postWithCsrf = async <T>(
  endpoint: string,
  body: any
): Promise<T> => {
  const url = `${BASE_URL}${endpoint}`;

  // Step 1: Fetch CSRF token
  const tokenRes = await fetch(url, {
    method: "GET",
    headers: {
      ...defaultHeaders,
      "X-CSRF-Token": "Fetch",
    },
  });

  const csrfToken = tokenRes.headers.get("x-csrf-token");
  if (!csrfToken) throw new Error("Missing CSRF Token");

  // Step 2: POST request
  return request<T>(url, {
    method: "POST",
    headers: {
      ...defaultHeaders,
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(body),
  });
};