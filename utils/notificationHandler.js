// filepath: /home/pirat/my-expo-app/utils/notificationHandler.js
/**
 * Simplified notification handler that avoids TypeScript transpilation issues
 * This file uses JavaScript instead of TypeScript to ensure maximum compatibility
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Motivational messages for notifications
const MOTIVATIONAL_MESSAGES = [
  "You're on a roll! Keep it up!",
  "Building this habit will change your life!",
  "Small steps lead to big results!",
  "Consistency is key to success!",
  "You've got this! Stay committed!",
  "Every effort counts towards your goal!",
  "Progress happens one day at a time!",
  "Your future self will thank you for this!",
  "Discipline equals freedom!",
  "The best time to start was yesterday. The next best time is now!",
];

// Get a random motivational message
function getRandomMessage() {
  const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
  return MOTIVATIONAL_MESSAGES[randomIndex];
}

// Request notification permissions
export async function registerForPushNotifications() {
  console.log('Notification handler: registerForPushNotifications called');
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6200EE',
      });
      
      Notifications.setNotificationChannelAsync('habit-reminders', {
        name: 'Habit Reminders',
        description: 'Reminders for your daily habits',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
      });
    }

    return true;
  } catch (error) {
    console.error('Notification handler: Error setting up notifications:', error);
    return false;
  }
}

// Save notification ID for a habit
export async function saveNotificationId(habitId, notificationId) {
  try {
    await AsyncStorage.setItem(`notification_${habitId}`, notificationId);
  } catch (error) {
    console.error('Notification handler: Error saving notification ID:', error);
  }
}

// Save multiple notification IDs for a habit
export async function saveNotificationIds(habitId, notificationIds) {
  try {
    await AsyncStorage.setItem(
      `notification_${habitId}`,
      JSON.stringify(notificationIds)
    );
  } catch (error) {
    console.error('Notification handler: Error saving notification IDs:', error);
  }
}

// Get notification IDs for a habit
export async function getNotificationIds(habitId) {
  try {
    const value = await AsyncStorage.getItem(`notification_${habitId}`);
    if (value) {
      if (value.startsWith('[')) {
        return JSON.parse(value);
      } else {
        return [value];
      }
    }
    return [];
  } catch (error) {
    console.error('Notification handler: Error getting notification IDs:', error);
    return [];
  }
}

// Cancel a scheduled notification for a habit
export async function cancelHabitReminder(habitId) {
  console.log('Notification handler: cancelHabitReminder called for habitId:', habitId);
  try {
    const notificationIds = await getNotificationIds(habitId);
    
    if (notificationIds && notificationIds.length > 0) {
      for (const id of notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      
      // Clear the stored notification IDs
      await AsyncStorage.removeItem(`notification_${habitId}`);
    }
    
    return true;
  } catch (error) {
    console.error('Notification handler: Error cancelling notification:', error);
    return false;
  }
}

// Cancel all scheduled notifications
export async function cancelAllHabitReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Get all keys in AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    
    // Filter out notification keys
    const notificationKeys = keys.filter(key => key.startsWith('notification_'));
    
    // Remove all notification IDs
    if (notificationKeys.length > 0) {
      await AsyncStorage.multiRemove(notificationKeys);
    }
    
    return true;
  } catch (error) {
    console.error('Notification handler: Error cancelling all notifications:', error);
    return false;
  }
}

// Schedule a notification for a habit
export async function scheduleHabitReminder(habit, timeString, isNewHabit = false) {
  try {
    console.log('Notification handler: scheduleHabitReminder called for:', habit.title);
    
    // Cancel any existing notifications for this habit first
    await cancelHabitReminder(habit.id);
    
    // If reminders aren't enabled, exit early
    if (!habit.reminderEnabled) {
      return null;
    }
    
    // Parse the time string
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Store notification IDs
    const notificationIds = [];
    
    // Map day abbreviations to indices (0=Sunday, 1=Monday, etc.)
    const dayMapping = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    
    // Only schedule ONE notification for the next upcoming occurrence
    const now = new Date();
    const todayIndex = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // For tracking the earliest upcoming day
    let earliestDayIndex = -1;
    let earliestDaysUntil = 8; // More than a week 
    
    // Find the next upcoming day from the frequency
    for (const day of habit.frequency) {
      const dayIndex = dayMapping[day];
      
      // Calculate days until this occurrence
      let daysUntil = (dayIndex - todayIndex + 7) % 7;
      
      // If it's today and the time has already passed, it should be next week
      if (daysUntil === 0) {
        if ((currentHour > hours) || (currentHour === hours && currentMinute >= minutes)) {
          daysUntil = 7;
        }
      }
      
      // Check if this is the earliest upcoming day
      if (daysUntil < earliestDaysUntil) {
        earliestDaysUntil = daysUntil;
        earliestDayIndex = dayIndex;
      }
    }
    
    // If we found an upcoming day, schedule the notification
    if (earliestDayIndex >= 0) {
      const dayName = Object.keys(dayMapping).find(key => dayMapping[key] === earliestDayIndex);
      
      // Create the target date object for the specific time
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + earliestDaysUntil);
      targetDate.setHours(hours, minutes, 0, 0);
      
      // Log the scheduled date and time for debugging
      const formattedDate = `${targetDate.getFullYear()}-${targetDate.getMonth()+1}-${targetDate.getDate()}`;
      const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}`;
      console.log(`Notification handler: Scheduling notification for ${habit.title} on ${dayName} at ${formattedDate} ${formattedTime}`);
      
      // Calculate seconds from now for the trigger
      const secondsFromNow = Math.round((targetDate.getTime() - now.getTime()) / 1000);
      console.log(`Notification handler: This is ${Math.round(secondsFromNow / 60)} minutes from now`);
      
      // For new habits where the time is very soon (within 2 minutes), 
      // skip scheduling to prevent immediate notifications
      if (isNewHabit && secondsFromNow < 120) {
        console.log(`Notification handler: New habit created with reminder time too soon (${secondsFromNow}s). Skipping notification.`);
        return [];
      }
      
      // Make sure we don't schedule for the past
      if (secondsFromNow <= 0) {
        console.log(`Notification handler: Cannot schedule notification for ${habit.title} in the past, adding 24 hours`);
        // Add 24 hours to target date
        targetDate.setDate(targetDate.getDate() + 1);
      }
      
      // Get a motivational message
      const motivationalMessage = getRandomMessage();
      
      // Schedule using a date-based trigger for exact timing
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for: ${habit.title}`,
          body: habit.description 
            ? `${habit.description}\n\n${motivationalMessage}` 
            : `${motivationalMessage}`,
          data: { habitId: habit.id, day: dayName },
          sound: true,
        },
        trigger: {
          date: targetDate,
        },
      });
      
      console.log(`Notification handler: Notification scheduled with ID: ${identifier} for ${habit.title}`);
      notificationIds.push(identifier);
      
      // Save notification IDs to AsyncStorage
      await saveNotificationIds(habit.id, notificationIds);
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Notification handler: Error scheduling notification:', error);
    return null;
  }
}

// Schedule a notification for a preset habit
export async function schedulePresetHabitNotification(habit, isNewHabit = true) {
  try {
    console.log(`Notification handler: Scheduling notification for preset habit: ${habit.title}`);
    
    if (habit.reminderEnabled && habit.reminderTime) {
      return await scheduleHabitReminder(habit, habit.reminderTime, isNewHabit);
    }
    return null;
  } catch (error) {
    console.error('Notification handler: Error scheduling notifications for preset habit:', error);
    return null;
  }
}

// Schedule notifications for achievement streaks
export async function scheduleAchievementNotification(habit, streakCount, isNewHabit = false) {
  try {
    // Don't show achievement notifications for new habits or small streaks
    if (streakCount < 3 || isNewHabit) return null;
    
    // Create a notification to be displayed later, not immediately
    const notificationDate = new Date();
    notificationDate.setMinutes(notificationDate.getMinutes() + 10); // 10 minutes from now
    
    const notificationContent = {
      title: `${streakCount} Day Streak! 🔥`,
      body: `Amazing! You've kept up your "${habit.title}" habit for ${streakCount} days in a row!`,
      data: { habitId: habit.id, type: 'achievement' },
      sound: true,
    };
    
    // Schedule achievement notification for later, not immediately
    const identifier = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        date: notificationDate,
      },
    });
    
    console.log(`Notification handler: Achievement notification scheduled for streak of ${streakCount} days at ${notificationDate.toLocaleString()}`);
    return identifier;
  } catch (error) {
    console.error('Notification handler: Error scheduling achievement notification:', error);
    return null;
  }
}

// Setup notification handlers
export function setupNotificationHandler() {
  console.log('Notification handler: setupNotificationHandler called');
  
  // When a notification is received while the app is foregrounded
  Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification handler: Notification received in foreground!', notification);
  });

  // When the user taps on or interacts with a notification
  Notifications.addNotificationResponseReceivedListener(response => {
    const { habitId } = response.notification.request.content.data;
    console.log('Notification handler: Notification interaction:', habitId);
    
    // Schedule the next notification for this habit after interaction
    if (habitId) {
      scheduleNextNotification(habitId);
    }
  });
}

// Schedule next notification after one is received or completed
export async function scheduleNextNotification(habitId) {
  try {
    console.log('Notification handler: scheduleNextNotification called for habitId:', habitId);
    // Get the habit data
    const habitsData = await AsyncStorage.getItem('habits');
    if (!habitsData) return;
    
    const habits = JSON.parse(habitsData);
    const habit = habits.find(h => h.id === habitId);
    
    if (habit && habit.reminderEnabled && habit.reminderTime) {
      // Schedule the next notification
      await scheduleHabitReminder(habit, habit.reminderTime);
    }
  } catch (error) {
    console.error('Notification handler: Error scheduling next notification:', error);
  }
}

// Initialize the notification system
export function initNotifications() {
  return registerForPushNotifications()
    .then(() => {
      setupNotificationHandler();
      console.log('Notification handler: Notification system initialized successfully');
      return true;
    })
    .catch(error => {
      console.error('Notification handler: Failed to initialize notification system:', error);
      return false;
    });
}

// For a better developer experience, add a test function
export async function scheduleTestNotification() {
  console.log('Notification handler: scheduleTestNotification called');
  
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This should appear 5 seconds after scheduling',
        data: { test: true },
      },
      trigger: {
        seconds: 5,
      },
    });
    
    console.log(`Notification handler: Test notification scheduled with ID: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error('Notification handler: Error scheduling test notification:', error);
    return null;
  }
}
