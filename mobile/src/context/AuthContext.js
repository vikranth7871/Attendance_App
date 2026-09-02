import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        await fetchUserProfile();
      }
    } catch (e) {
      console.error('Auth load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data } = await api.get('/auth/profile');
      setUser(data);
      return data;
    } catch (error) {
      await AsyncStorage.removeItem('token');
      setToken(null);
      setUser(null);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await AsyncStorage.setItem('token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setToken(data.token);
      setUser(data);
      return { success: true, role: data.role, user: data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Check your credentials.',
      };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, fetchUserProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
