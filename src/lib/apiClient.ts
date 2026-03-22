import type { ApiError } from "./apiTypes";

function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("Missing VITE_API_BASE_URL. Add it to LakshayAI-frontend/.env.");
  }
  return baseUrl;
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getApiError(payload: unknown, fallbackMessage: string): ApiError {
  if (isRecord(payload) && isRecord(payload.error)) {
    return {
      message:
        typeof payload.error.message === "string"
          ? payload.error.message
          : fallbackMessage,
      code: typeof payload.error.code === "string" ? payload.error.code : undefined,
      details: typeof payload.error.details === "string" ? payload.error.details : undefined
    };
  }

  if (isRecord(payload) && typeof payload.error === "string") {
    return { message: payload.error };
  }

  return { message: fallbackMessage };
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    }
  });

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    throw new Error(getApiError(payload, `Request failed with status ${response.status}`).message);
  }

  if (isRecord(payload) && "error" in payload && payload.error) {
    throw new Error(getApiError(payload, "The server returned an error.").message);
  }

  if (isRecord(payload) && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export function get<T>(path: string, accessToken?: string | null) {
  return request<T>(path, { method: "GET" }, accessToken);
}

export function post<T, B = unknown>(path: string, body?: B, accessToken?: string | null) {
  return request<T>(
    path,
    {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body)
    },
    accessToken
  );
}
