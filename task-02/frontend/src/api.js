import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5002/api',
});

export default api;

export function getUserId() {
  let id = localStorage.getItem('storefront_user_id');
  if (!id) {
    id = 'user-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('storefront_user_id', id);
  }
  return id;
}
