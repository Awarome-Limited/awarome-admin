import 'server-only';
import { getSession } from '@/lib/session';

const API_BASE_URL = process.env.AWAROME_API_BASE_URL;
const API_KEY = process.env.AWAROME_API_KEY;

export interface PaginatedResponse<T> {
  data: T[];
  message: string;
  skip: number;
  limit: number;
  totalCount: number;
}

export interface SingleResponse<T> {
  data: T;
  message: string;
}

export class ApiError extends Error {
  statusCode: number;
  data?: unknown;

  constructor(message: string, statusCode: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  token?: string;
  body?: unknown;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  if (!API_BASE_URL || !API_KEY) {
    throw new Error(
      'AWAROME_API_BASE_URL and AWAROME_API_KEY must be set in the environment'
    );
  }

  const { token, body, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'x-awrm-api-key': API_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.message || 'Request failed',
      response.status,
      payload
    );
  }

  return payload as T;
}

// Convenience wrapper for the common case: an authenticated staff request
// using the current session's token.
export async function authedFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const session = await getSession();
  if (!session) {
    throw new ApiError('Not authenticated', 401);
  }

  return apiFetch<T>(path, { ...options, token: session.token });
}

// Multipart sibling of authedFetch. apiFetch always sets a JSON content type
// and stringifies the body, so it cannot post files — here fetch sets the
// multipart boundary itself.
export async function authedUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  if (!API_BASE_URL || !API_KEY) {
    throw new Error(
      'AWAROME_API_BASE_URL and AWAROME_API_KEY must be set in the environment'
    );
  }

  const session = await getSession();
  if (!session) {
    throw new ApiError('Not authenticated', 401);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'x-awrm-api-key': API_KEY,
      Authorization: `Bearer ${session.token}`,
    },
    body: formData,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.message || 'Upload failed',
      response.status,
      payload
    );
  }

  return payload as T;
}
