export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_CACHE_TTL_MS = 30000; // 30 seconds cache for rapid navigation
const TOKEN_KEY = 'sms-access-token';
let refreshRequest = null;
let accessToken = (() => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
})();

// In-memory response cache and in-flight request deduplication
const responseCache = new Map();
const inFlightRequests = new Map();

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
    refreshRequest = rawRequest('/auth/refresh-token', { method: 'POST' }, { skipAuthRefresh: true })
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

async function rawRequest(path, options = {}, requestOptions = {}) {
  const token = getAccessToken();
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
      return rawRequest(path, options, { skipAuthRefresh: true });
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

export function invalidateApiCache(prefix = '') {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
    }
  }
}

export function setAccessToken(token) {
  accessToken = token || null;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

export function getAccessToken() {
  return accessToken;
}

async function getCached(path, options = {}) {
  const bypassCache = options.bypassCache || false;
  const ttl = options.ttlMs || DEFAULT_CACHE_TTL_MS;
  const now = Date.now();

  if (!bypassCache) {
    const cached = responseCache.get(path);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
    // In-flight deduplication: return the promise that is already running
    const running = inFlightRequests.get(path);
    if (running) {
      return running;
    }
  }

  const promise = (async () => {
    try {
      const data = await rawRequest(path, options);
      responseCache.set(path, {
        data,
        expiresAt: Date.now() + ttl,
      });
      return data;
    } finally {
      inFlightRequests.delete(path);
    }
  })();

  inFlightRequests.set(path, promise);
  return promise;
}

export const api = {
  get: (path, options = {}) => getCached(path, options),
  post: async (path, body, options = {}) => {
    const res = await rawRequest(path, { ...options, method: 'POST', body: JSON.stringify(body) });
    invalidateApiCache();
    return res;
  },
  patch: async (path, body) => {
    const res = await rawRequest(path, { method: 'PATCH', body: JSON.stringify(body) });
    invalidateApiCache();
    return res;
  },
  delete: async (path) => {
    const res = await rawRequest(path, { method: 'DELETE' });
    invalidateApiCache();
    return res;
  },
  upload: async (path, formData) => {
    const res = await rawRequest(path, { method: 'POST', body: formData });
    invalidateApiCache();
    return res;
  },
  invalidate: invalidateApiCache,
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
  activateAccount: (payload) => api.post('/auth/activate-account', payload),
  resendActivation: (payload) => api.post('/auth/resend-activation', payload),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me', { bypassCache: true }),
  refresh: () => refreshAccessToken().then((token) => ({ data: { accessToken: token } })),
};

export const onboardingApi = {
  onboardStudent: (payload) => api.post('/students/onboard', payload),
  onboardTeacher: (payload) => api.post('/teachers/onboard', payload),
  onboardParent: (payload) => api.post('/parents/onboard', payload),
  getActivationLink: (userId) => api.get(`/users/${userId}/activation-link`, { bypassCache: true }),
};

export const razorpayApi = {
  createOrder: (payload) => api.post('/create-order', payload),
  verifyPayment: (payload) => api.post('/verify-payment', payload),
};

