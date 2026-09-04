import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, darkColors, lightColors, setGlobalTheme, getGlobalTheme } from '../styles/theme';

const THEME_STORAGE_KEY = '@iattend_theme';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: getGlobalTheme(),
      isDark: getGlobalTheme() === 'dark',
      colors,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    // Load persisted theme
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
          setGlobalTheme(savedTheme);
        }
      } catch (err) {
        console.warn('Failed to load theme preference:', err);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark') return;
    setThemeState(newTheme);
    setGlobalTheme(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (err) {
      console.warn('Failed to save theme preference:', err);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const isDark = theme === 'dark';
  const activeColors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors: activeColors,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;

