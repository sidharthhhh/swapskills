import axios from 'axios';

const api = axios.create({
  baseURL: process.env.BACKEND_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — handled by NextAuth session management
    }
    return Promise.reject(error);
  }
);

export default api;
