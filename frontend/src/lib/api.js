import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const apiMessage = err.response?.data?.message;
    // A 5xx with no JSON message is the dev proxy hitting a dead backend
    // (ECONNREFUSED) — report that honestly instead of a bare status code.
    const backendDown = err.code === 'ERR_NETWORK' || (!apiMessage && (err.response?.status ?? 0) >= 500);
    err.friendlyMessage = apiMessage || (backendDown
      ? 'Cannot reach the server — the backend on port 5000 is not running.'
      : err.message);
    return Promise.reject(err);
  }
);

/* ── Endpoints ─────────────────────────────────────────────── */
export const authApi = {
  me: () => api.get('/auth/me').then((r) => r.data),
  updateProfile: (payload) => api.put('/auth/profile', payload).then((r) => r.data),
  changePassword: (payload) => api.put('/auth/password', payload).then((r) => r.data),
};

export const clientApi = {
  list: (params) => api.get('/clients', { params }).then((r) => r.data),
  get: (id) => api.get(`/clients/${id}`).then((r) => r.data),
  create: (payload) => api.post('/clients', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/clients/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/clients/${id}`).then((r) => r.data),
  activities: (id, params) => api.get(`/clients/${id}/activities`, { params }).then((r) => r.data),
  addActivity: (id, payload) => api.post(`/clients/${id}/activities`, payload).then((r) => r.data),
};

export const projectApi = {
  list: (params) => api.get('/projects', { params }).then((r) => r.data),
  save: (clientId, payload) => api.put(`/projects/client/${clientId}`, payload).then((r) => r.data),
  uploadShots: (clientId, type, files, onProgress) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('images', f));
    return api
      .post(`/projects/client/${clientId}/screenshots?type=${type}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / (e.total || 1))),
      })
      .then((r) => r.data);
  },
  deleteShot: (clientId, shotId, type) =>
    api.delete(`/projects/client/${clientId}/screenshots/${shotId}?type=${type}`).then((r) => r.data),
};

export const paymentApi = {
  list: (params) => api.get('/payments', { params }).then((r) => r.data),
  save: (clientId, payload) => api.put(`/payments/client/${clientId}`, payload).then((r) => r.data),
  addEntry: (clientId, payload) => api.post(`/payments/client/${clientId}/entry`, payload).then((r) => r.data),
  editEntry: (clientId, entryId, payload) =>
    api.put(`/payments/client/${clientId}/entry/${entryId}`, payload).then((r) => r.data),
  deleteEntry: (clientId, entryId) => api.delete(`/payments/client/${clientId}/entry/${entryId}`).then((r) => r.data),
  logs: (params) => api.get('/payments/logs', { params }).then((r) => r.data),
};

export const domainApi = {
  list: () => api.get('/domains').then((r) => r.data),
  save: (clientId, payload) => api.put(`/domains/client/${clientId}`, payload).then((r) => r.data),
};

export const reportApi = {
  dashboard: (params) => api.get('/reports/dashboard', { params }).then((r) => r.data),
  full: (params) => api.get('/reports', { params }).then((r) => r.data),
};

export const notificationApi = {
  list: () => api.get('/notifications').then((r) => r.data),
};

export const teamApi = {
  getMatrix: (params) => api.get('/team/matrix', { params }).then((r) => r.data),
  listEmployees: () => api.get('/team/employees').then((r) => r.data),
  createEmployee: (payload) => api.post('/team/employees', payload).then((r) => r.data),
  updateEmployee: (id, payload) => api.put(`/team/employees/${id}`, payload).then((r) => r.data),
  deleteEmployee: (id) => api.delete(`/team/employees/${id}`).then((r) => r.data),
  listPayments: (params) => api.get('/team/payments', { params }).then((r) => r.data),
  addPayment: (payload) => api.post('/team/payments', payload).then((r) => r.data),
  updatePayment: (id, payload) => api.put(`/team/payments/${id}`, payload).then((r) => r.data),
  deletePayment: (id) => api.delete(`/team/payments/${id}`).then((r) => r.data),
};

export default api;
