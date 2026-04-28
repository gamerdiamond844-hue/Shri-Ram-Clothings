import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('src_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('src_token');
      localStorage.removeItem('src_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/**
 * Download a file from a protected API endpoint.
 * Uses axios (with auth token) instead of window.open().
 * @param {string} url  - API path e.g. '/admin/analytics/export?type=orders'
 * @param {string} filename - suggested filename e.g. 'orders.xlsx'
 */
export const downloadFile = async (url, filename) => {
  const token = localStorage.getItem('src_token');
  if (!token) {
    alert('You are not logged in. Please login again.');
    window.location.href = '/login';
    return;
  }
  const res = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename || 'export.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export default api;
