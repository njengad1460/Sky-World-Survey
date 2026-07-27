import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// Resolve API base URL with a browser-friendly fallback.
// When running the frontend in the host browser, the Docker-internal hostname
// `api` is not resolvable. Prefer a host-mapped address (`localhost`) if needed.
const configuredBase = import.meta.env.VITE_API_BASE_URL;
let resolvedBase = configuredBase;

if (typeof window !== 'undefined') {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (!isLocalhost) {
    // On production/EC2, if the URL is missing, points to localhost, or points to the internal Docker 'api' host,
    // we must use the relative path so the Nginx reverse proxy can correctly route it.
    if (!resolvedBase || resolvedBase.includes('localhost') || resolvedBase.includes('://api')) {
      resolvedBase = '/api';
    }
  } else {
    // On local development, if the URL points to the internal Docker 'api' host,
    // replace it with localhost so the host browser can reach it.
    if (resolvedBase && resolvedBase.includes('://api')) {
      resolvedBase = resolvedBase.replace('://api', '://localhost');
    }
  }
}

if (!resolvedBase) {
  resolvedBase = 'http://localhost:5000/api';
}

export const API_BASE_URL = resolvedBase;

const api = axios.create({
  baseURL: resolvedBase,
  timeout: 30000,
  headers: {
    'Accept': 'application/xml',
  }
});

// Interceptor to inject Cognito JWT tokens dynamically
api.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
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
