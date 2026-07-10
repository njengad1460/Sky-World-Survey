import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Accept': 'application/xml',
  }
});

// Interceptor to inject Cognito JWT tokens dynamically
api.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('User not authenticated, proceeding with anonymous request traits.');
  }

  // Handle standard Content-Type configuration safety overrides
  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
  } else if (config.data) {
    config.headers['Content-Type'] = 'application/xml';
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;