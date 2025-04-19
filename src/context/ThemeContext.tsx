import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ColorSchemeName = 'light' | 'dark' | null;

export type ThemeType = {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
    accent: string;
    success: string;
    error: string;
    warning: string;
    muted: string;
    cardBackground: string;
    lightBackground: string;
  };
};

const lightTheme: ThemeType = {
  dark: false,
  colors: {
    primary: '#6200ee',
    background: '#f9f9f9',
    card: '#ffffff',
    text: '#333333',
    border: '#e0e0e0',
    notification: '#ff3b30',
    accent: '#03dac6',
    success: '#4CAF50',
    error: '#e53935',
    warning: '#FF9800',
    muted: '#8a8a8a',
    cardBackground: '#ffffff',
    lightBackground: '#f0e6ff',
  },
};

const darkTheme: ThemeType = {
  dark: true,
  colors: {
    primary: '#bb86fc',
    background: '#121212',
    card: '#1e1e1e',
    text: '#e0e0e0',
    border: '#2c2c2c',
    notification: '#ff6b6b',
    accent: '#03dac6',
    success: '#66bb6a',
    error: '#f44336',
    warning: '#ffb74d',
    muted: '#a0a0a0',
    cardBackground: '#2c2c2c',
    lightBackground: '#3a2f45',
  },
};

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  toggleTheme: () => void;
  setScheme: (scheme: 'light' | 'dark' | 'system') => void;
  currentScheme: string;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setScheme: () => {},
  currentScheme: 'light',
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [currentScheme, setCurrentScheme] = useState<string>('system');
  const [theme, setTheme] = useState<ThemeType>(
    (systemColorScheme ?? 'light') === 'dark' ? darkTheme : lightTheme
  );

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedScheme = await AsyncStorage.getItem('themePreference');
        if (savedScheme) {
          setCurrentScheme(savedScheme);
          updateTheme(savedScheme as 'light' | 'dark' | 'system', systemColorScheme ?? 'light');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };

    loadThemePreference();
  }, [systemColorScheme]);

  const updateTheme = (scheme: 'light' | 'dark' | 'system', systemScheme: ColorSchemeName) => {
    let newTheme: ThemeType;
    
    switch (scheme) {
      case 'light':
        newTheme = lightTheme;
        break;
      case 'dark':
        newTheme = darkTheme;
        break;
      case 'system':
      default:
        newTheme = systemScheme === 'dark' ? darkTheme : lightTheme;
        break;
    }
    
    setTheme(newTheme);
  };

  const toggleTheme = () => {
    const newScheme = theme.dark ? 'light' : 'dark';
    setScheme(newScheme);
  };

  const setScheme = async (scheme: 'light' | 'dark' | 'system') => {
    try {
      await AsyncStorage.setItem('themePreference', scheme);
      setCurrentScheme(scheme);
      updateTheme(scheme, systemColorScheme ?? 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        isDark: theme.dark, 
        toggleTheme, 
        setScheme,
        currentScheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);