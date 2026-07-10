const BASE_URL = "/api/v1";

// Token is stored in memory (survives page navigation, cleared on tab close)
// and also persisted to sessionStorage so refresh doesn't log user out.
let _token: string | null = null;

export const tokenStore = {
  get: (): string | null => {
    if (_token) return _token;
    try {
      _token = sessionStorage.getItem("auth_token");
    } catch {}
    return _token;
  },
  set: (token: string) => {
    _token = token;
    try {
      sessionStorage.setItem("auth_token", token);
    } catch {}
  },
  clear: () => {
    _token = null;
    try {
      sessionStorage.removeItem("auth_token");
    } catch {}
  },
};

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

async function fetchApi<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...init } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        searchParams.set(k, String(v));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const token = tokenStore.get();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    credentials: "include", // keep for cookie fallback
    headers,
    ...init,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) =>
    fetchApi<T>(path, { method: "GET", params }),

  post: <T>(path: string, body: unknown) =>
    fetchApi<T>(path, { method: "POST", body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    fetchApi<T>(path, { method: "PUT", body: JSON.stringify(body) }),

  delete: (path: string) =>
    fetchApi<void>(path, { method: "DELETE" }),
};
