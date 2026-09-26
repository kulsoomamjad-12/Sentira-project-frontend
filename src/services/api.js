import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE_URL });

// Attach the JWT to every request if the user is logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 means the stored token is missing/expired/invalid — clear the stale
// session and send the user back to login instead of leaving every page
// silently broken (empty data, unhandled promise rejections in the console).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getCurrentUser = () => api.get('/auth/me');
export const updateProfile = (data) => api.patch('/auth/me', data);
export const changePassword = (data) => api.patch('/auth/me/password', data);
export const deleteAccount = (data) => api.delete('/auth/me', { data });
export const getInviteLink = () => api.get('/auth/invite-link');
export const regenerateInviteLink = () => api.post('/auth/invite-link/regenerate');
export const sendInviteEmail = (name, email) => api.post('/auth/invite-link/send', { name, email });
export const getTeam = () => api.get('/auth/team');
export const removeTeamMember = (id) => api.delete(`/auth/team/${id}`);

// --- Forms ---
export const createForm = (data) => api.post('/forms', data);
export const updateForm = (id, data) => api.put(`/forms/${id}`, data);
export const getForms = () => api.get('/forms');
export const getPublicForm = (slug) => api.get(`/forms/public/${slug}`);
export const deleteForm = (id) => api.delete(`/forms/${id}`);

// --- Feedback ---
export const submitFeedback = (slug, data) => api.post(`/feedback/${slug}`, data);
export const logExternalFeedback = (data) => api.post('/feedback/external', data);
export const getFeedback = (params) => api.get('/feedback', { params });
export const getAnalyticsSummary = (params) => api.get('/feedback/analytics/summary', { params });
export const getTopicTrends = (params) => api.get('/feedback/analytics/trends', { params });
export const translateFeedbackItem = (id) => api.post(`/feedback/${id}/translate`);
export const draftFeedbackReply = (id) => api.post(`/feedback/${id}/draft-response`);
export const sendFeedbackReply = (id, message) => api.post(`/feedback/${id}/send-reply`, { message });
export const deleteAllFeedback = (password) => api.delete('/feedback/all', { data: { password } });
export const deleteFeedbackItem = (id) => api.delete(`/feedback/${id}`);

// --- Social media import (Apify) ---
export const fetchSocialComments = (data) => api.post('/social-import/fetch', data);
export const getSocialImportSources = () => api.get('/social-import/sources');
export const createSocialImportSource = (data) => api.post('/social-import/sources', data);
export const updateSocialImportSource = (id, data) => api.patch(`/social-import/sources/${id}`, data);
export const deleteSocialImportSource = (id) => api.delete(`/social-import/sources/${id}`);
export const runSocialImportSourceNow = (id) => api.post(`/social-import/sources/${id}/run`);

// --- Tickets ---
export const createTicket = (data) => api.post('/tickets', data);
export const getTickets = (params) => api.get('/tickets', { params });
export const updateTicket = (id, data) => api.patch(`/tickets/${id}`, data);

export default api;
