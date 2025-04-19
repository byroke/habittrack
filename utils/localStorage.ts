import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isSameDay, parseISO } from 'date-fns';

import { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Define IconName type for MaterialCommunityIcons
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Define Habit type for type safety
export type Habit = {
  id: string;
  title: string;
  description?: string;
  category: string;
  icon: IconName;
  color: string;
  createdAt: string;
  frequency: string[];
  completedDates: string[];
  currentStreak: number;
  longestStreak: number;
  completed?: boolean; // For today's status
  reminderEnabled?: boolean; // Whether reminder is enabled
  reminderTime?: string; // Time of day to remind "HH:MM"
};

// Define AppSettings type
export type AppSettings = {
  userName: string;
  darkMode: boolean;
  notificationsEnabled: boolean;
  reminderTime: string;
  weekStartsOn: string;
  dataBackup: boolean;
  clearCompletedAfterDays: number;
};

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  userName: 'Friend',
  darkMode: false,
  notificationsEnabled: true,
  reminderTime: '20:00',
  weekStartsOn: 'Monday',
  dataBackup: false,
  clearCompletedAfterDays: 30,
};

// Get all habits from storage
export const getHabits = async (): Promise<Habit[]> => {
  try {
    const storedHabits = await AsyncStorage.getItem('habits');
    if (storedHabits) {
      return JSON.parse(storedHabits);
    }
    return [];
  } catch (error) {
    console.error('Error fetching habits:', error);
    return [];
  }
};

// Save all habits to storage
export const saveHabits = async (habits: Habit[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem('habits', JSON.stringify(habits));
    return true;
  } catch (error) {
    console.error('Error saving habits:', error);
    return false;
  }
};

// Mark a habit as completed/incomplete for today
export const markHabitCompleted = async (id: string, isCompleted: boolean): Promise<boolean> => {
  try {
    const habits = await getHabits();
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const updatedHabits = habits.map(habit => {
      if (habit.id === id) {
        let completedDates = [...(habit.completedDates || [])];
        
        if (isCompleted) {
          // Add today's date if not already included
          if (!completedDates.includes(today)) {
            completedDates.push(today);
          }
        } else {
          // Remove today's date if present
          completedDates = completedDates.filter(date => date !== today);
        }
        
        // Calculate streaks
        let currentStreak = 0;
        
        // If completed today, calculate the current streak
        if (isCompleted) {
          currentStreak = 1; // At least 1 for today
          let checkDate = subDays(new Date(), 1);
          
          // Look back day by day to check for continuous streak
          while (true) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            if (completedDates.includes(dateStr)) {
              currentStreak++;
              checkDate = subDays(checkDate, 1);
            } else {
              break;
            }
          }
        }
        
        return {
          ...habit,
          completedDates,
          currentStreak,
          longestStreak: Math.max(habit.longestStreak || 0, currentStreak),
          completed: isCompleted
        };
      }
      return habit;
    });
    
    await saveHabits(updatedHabits);
    return true;
  } catch (error) {
    console.error('Error updating habit completion:', error);
    return false;
  }
};

// Get app settings
export const getSettings = async (): Promise<AppSettings> => {
  try {
    const storedSettings = await AsyncStorage.getItem('appSettings');
    if (storedSettings) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
    }
    
    // For backward compatibility, check for userName separately
    const userName = await AsyncStorage.getItem('userName');
    if (userName) {
      return { ...DEFAULT_SETTINGS, userName };
    }
    
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return DEFAULT_SETTINGS;
  }
};

// Save app settings
export const saveSettings = async (settings: AppSettings): Promise<boolean> => {
  try {
    await AsyncStorage.setItem('appSettings', JSON.stringify(settings));
    
    // Also save userName separately for backward compatibility
    await AsyncStorage.setItem('userName', settings.userName);
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

// Helper functions
const subDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};