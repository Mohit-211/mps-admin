// Thin fetch wrapper for the MyPageSEO backend (docs/ADMIN_PANEL.md §1).
// Every response is { success, status, message, data }; errors carry a machine code in data.reason.

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(/\/+$/, "");

const TOKEN_KEY = "mps_admin_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable: the session just won't survive a reload
  }
}

type Envelope<T> = {
  success: boolean;
  status: number;
  message: string;
  data: T;
};

export type ErrorData = { reason?: string; [key: string]: unknown } | null;

export class ApiError extends Error {
  status: number;
  reason?: string;
  data: ErrorData;

  constructor(status: number, message: string, data: ErrorData) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.reason = data?.reason;
  }
}

// Called on any 401 from an authenticated request (expired / revoked token).
let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  auth?: boolean;
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function send(path: string, { method = "GET", body, query, auth = true, signal }: RequestOptions) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.", null);
  }

  if (response.status === 401 && auth) unauthorizedHandler?.();
  return response;
}

async function toApiError(response: Response): Promise<ApiError> {
  let envelope: Partial<Envelope<ErrorData>> | null = null;
  try {
    envelope = await response.json();
  } catch {
    // non-JSON error body
  }
  const data = envelope?.data && typeof envelope.data === "object" ? envelope.data : null;
  return new ApiError(response.status, envelope?.message || `Request failed (${response.status}).`, data);
}

/** JSON request; resolves with the envelope's `data`, throws ApiError otherwise. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (!response.ok) throw await toApiError(response);
  const envelope = (await response.json()) as Envelope<T>;
  return envelope.data;
}

/** Binary download (PDFs) with the auth header. */
export async function apiBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await send(path, options);
  if (!response.ok) throw await toApiError(response);
  return response.blob();
}

/** The message to show the admin for any thrown error. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
