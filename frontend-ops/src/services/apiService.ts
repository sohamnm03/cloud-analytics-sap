export const request = async <T>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  const res = await fetch(url, options);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "API Error");
  }

  return res.json();
};