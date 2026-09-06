import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

import { Platform } from 'react-native';

// Dynamically determine backend host IP:
// - On web: use the current browser hostname (e.g. localhost or 127.0.0.1)
// - On native mobile: get LAN host IP dynamically from Expo Go / Metro hostUri
let host = 'localhost';
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
  host = window.location.hostname;
} else {
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri || '';
  if (debuggerHost) {
    host = debuggerHost.split(':')[0];
  }
}

// Default to port 5005
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${host}:5005/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});


// Attach JWT token to every outgoing request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // Also keep defaults in sync so subsequent calls without interceptor work
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Could not read token from storage:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage
      await AsyncStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;
