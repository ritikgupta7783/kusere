import axios from 'axios';

const CSRF_COOKIE = 'bmh_csrf';
const baseURL = `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api`;

const api = axios.create({ baseURL, withCredentials: true, timeout: 20000 });

const readCookie = (name) => {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
};

let csrfPromise = null;
/** Makes sure the CSRF cookie exists (the server sets it on this call). */
export const ensureCsrf = () => {
  if (readCookie(CSRF_COOKIE)) return Promise.resolve();
  if (!csrfPromise) csrfPromise = api.get('/csrf-token').finally(() => { csrfPromise = null; });
  return csrfPromise;
};

api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
    await ensureCsrf();
    const token = readCookie(CSRF_COOKIE);
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config;
    if (error.response?.data?.code === 'CSRF_FAILED' && cfg && !cfg._retried) {
      cfg._retried = true;
      document.cookie = `${CSRF_COOKIE}=; Max-Age=0; path=/`;
      await ensureCsrf();
      return api(cfg);
    }
    return Promise.reject(error);
  }
);

/** Turns any axios error into { message, code, fields }. */
export const parseError = (error) => {
  const data = error?.response?.data;
  if (data) return { message: data.message || 'Something went wrong', code: data.code, fields: data.fields || {}, status: error.response.status };
  if (error?.code === 'ECONNABORTED') return { message: 'The server took too long to respond. Please try again.', code: 'TIMEOUT', fields: {} };
  return { message: 'Cannot reach the server. Check your connection and try again.', code: 'NETWORK', fields: {} };
};

export default api;
