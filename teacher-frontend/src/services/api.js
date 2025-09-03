import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API Base URL:', api.defaults.baseURL);

// Request interceptor for JWT
api.interceptors.request.use(config => {
  console.log('API Request:', config.method?.toUpperCase(), config.url);
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for debugging
api.interceptors.response.use(
  response => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  error => {
    console.error('API Error:', error.response?.status, error.response?.data, error.config?.url);
    return Promise.reject(error);
  }
);

export default api;