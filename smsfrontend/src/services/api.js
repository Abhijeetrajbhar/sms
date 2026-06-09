const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const TOKEN_KEY = 'sms-token';
const REQUEST_TIMEOUT_MS = 15000;
let refreshRequest = null;

export class ApiError extends Error {
  constructor(message, { status = 0, details = null, code = 'REQUEST_FAILED' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('The server returned an unreadable response.', {
      status: response.status,
      code: 'INVALID_RESPONSE',
    });
  }
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = request('/auth/refresh-token', { method: 'POST' }, { skipAuthRefresh: true })
      .then((response) => {
        const token = response?.data?.accessToken;
        if (!token) throw new ApiError('Your session could not be refreshed.', { status: 401, code: 'SESSION_EXPIRED' });
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

async function request(path, options = {}, requestOptions = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: {
        ...(!(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('The request took too long. Please try again.', { code: 'TIMEOUT' });
    }
    throw new ApiError('Unable to connect to the server. Check your connection and try again.', { code: 'NETWORK_ERROR' });
  } finally {
    window.clearTimeout(timeout);
  }

  if (response.status === 401 && !requestOptions.skipAuthRefresh && !path.startsWith('/auth/')) {
    try {
      await refreshAccessToken();
      return request(path, options, { skipAuthRefresh: true });
    } catch {
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent('sms:session-expired'));
      throw new ApiError('Your session has expired. Please sign in again.', { status: 401, code: 'SESSION_EXPIRED' });
    }
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    const fieldMessage = Array.isArray(payload?.errors) ? payload.errors[0]?.message : null;
    throw new ApiError(fieldMessage || payload?.message || 'The request could not be completed.', {
      status: response.status,
      details: payload?.error || payload?.errors || null,
      code: response.status === 403 ? 'FORBIDDEN' : 'REQUEST_FAILED',
    });
  }

  return payload;
}

export function setAccessToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export const api = {
  get: (path) => request(path),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  download: async (path, filename) => {
    const token = getAccessToken();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      throw new ApiError('Unable to download the receipt. Check your connection and try again.', { code: 'NETWORK_ERROR' });
    }
    if (!response.ok) {
      const payload = await parseResponse(response);
      throw new ApiError(payload?.message || 'Unable to download the receipt.', { status: response.status });
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'receipt.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh-token'),
};
