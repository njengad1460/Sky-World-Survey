import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000,
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
    // In development mode without Cognito, this is expected
    if (import.meta.env.MODE !== 'production') {
      console.log('No authentication session available (development mode)');
    } else {
      console.warn('User not authenticated, proceeding with anonymous request traits.', err.message);
    }
  }

  // Handle standard Content-Type configuration safety overrides
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']; // Let Axios set the boundary automatically
  } else if (config.data) {
    config.headers['Content-Type'] = 'application/xml';
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
