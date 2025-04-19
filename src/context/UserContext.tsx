import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserContextType = {
  userName: string;
  updateUserName: (name: string) => Promise<void>;
  isLoading: boolean;
};

const UserContext = createContext<UserContextType>({
  userName: 'Friend',
  updateUserName: async () => {},
  isLoading: true
});

export const UserProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [userName, setUserName] = useState('Friend');
  const [isLoading, setIsLoading] = useState(true);

  // Load user name on initial mount
  useEffect(() => {
    const loadUserName = async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        if (storedName) {
          setUserName(storedName);
        }
      } catch (error) {
        console.error('Error loading user name:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserName();
  }, []);

  // Update user name function that will be shared across components
  const updateUserName = async (name: string) => {
    if (name && name.trim() !== '') {
      try {
        await AsyncStorage.setItem('userName', name);
        setUserName(name);
      } catch (error) {
        console.error('Error saving user name:', error);
        throw new Error('Could not save your name. Please try again.');
      }
    }
  };

  return (
    <UserContext.Provider value={{ userName, updateUserName, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the user context
export const useUser = () => useContext(UserContext);