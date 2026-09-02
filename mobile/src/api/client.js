import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

// Get LAN host IP dynamically from Expo Go / Metro bundler if available
const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri || '';
const lanIp = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';

// Default to LAN IP so physical devices on Wi-Fi reach the backend at port 5005
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${lanIp}:5005/api`;

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
