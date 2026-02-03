import axios from 'axios';

// Set default base URL for all API requests
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to all requests - get from localStorage (set by AuthContext)
axiosInstance.interceptors.request.use(
  (config) => {
    // Read token from localStorage where AuthContext stores it
    const token = localStorage.getItem('token');
    console.log('Token in request:', token ? 'Present' : 'Missing');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('token');
      axios.defaults.headers.common['Authorization'] = '';
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
