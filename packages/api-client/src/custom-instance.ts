let baseUrl = '';

export function setBaseUrl(url: string): void {
  baseUrl = url;
}

export const customInstance = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: unknown = await response.json();

  return { data, status: response.status, headers: response.headers } as T;
};

export default customInstance;
