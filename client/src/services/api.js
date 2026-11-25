import axios from 'axios';

const baseURL = `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api`;

const api = axios.create({ baseURL, withCredentials: true, timeout: 20000 });

let csrfToken = null;
let csrfPromise = null;

/** Fetches CSRF token from the server (sets cookie + returns token for cross-domain SPAs). */
export const ensureCsrf = () => {
  if (csrfToken) return Promise.resolve(csrfToken);
  if (!csrfPromise) {
    csrfPromise = api
      .get('/csrf-token')
      .then((res) => {
        csrfToken = res.data?.csrfToken || null;
        return csrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
};

api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
    const token = await ensureCsrf();
    if (token) {
      config.headers = config.headers || {};
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config;
    if (error.response?.data?.code === 'CSRF_FAILED' && cfg && !cfg._retried) {
      cfg._retried = true;
      csrfToken = null;
      const freshToken = await ensureCsrf();
      if (freshToken) {
        cfg.headers = cfg.headers || {};
        cfg.headers['X-CSRF-Token'] = freshToken;
      }
      return api(cfg);
    }
    return Promise.reject(error);
  }
);

/** Turns any axios error into { message, code, fields }. */
export const parseError = (error) => {
  const data = error?.response?.data;
  if (data) {
    return {
      message: data.message || 'Something went wrong',
      code: data.code,
      fields: data.fields || {},
      status: error.response.status,
    };
  }
  if (error?.code === 'ECONNABORTED') {
    return {
      message: 'The server took too long to respond. Please try again.',
      code: 'TIMEOUT',
      fields: {},
    };
  }
  return {
    message: 'Cannot reach the server. Check your connection and try again.',
    code: 'NETWORK',
    fields: {},
  };
};

export default api;
