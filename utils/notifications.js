// filepath: /home/pirat/my-expo-app/utils/notifications.js
/**
 * Simplified Notification System
 * This file contains all notification-related functionality for the app
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------
// SETUP & CONFIGURATION
// ---------------------------------

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

// ---------------------------------
// HELPER FUNCTIONS
// ---------------------------------

// Get random motivational message
export function getRandomMessage() {
  const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
  return MOTIVATIONAL_MESSAGES[randomIndex];
}

// Request notification permissions
export async function requestPermissions() {
  console.log('🔔 Requesting notification permissions');
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('🔔 Notification permissions denied');
      return false;
    }

    // Create notification channels for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('habit-reminders', {
        name: 'Habit Reminders',
        description: 'Reminders for your daily habits',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
      });
    }

    console.log('🔔 Notification permissions granted');
    return true;
  } catch (error) {
    console.error('🔔 Error requesting permissions:', error);
    return false;
  }
}

// Save notification IDs to AsyncStorage
async function saveNotificationIds(habitId, notificationIds) {
  try {
    if (!habitId || !notificationIds) {
      console.error('🔔 Invalid habitId or notificationIds');
      return;
    }
    
    await AsyncStorage.setItem(
      `notification_${habitId}`,
      JSON.stringify(notificationIds)
    );
    console.log(`🔔 Saved ${notificationIds.length} notification IDs for habit: ${habitId}`);
  } catch (error) {
    console.error('🔔 Error saving notification IDs:', error);
  }
}

// Get notification IDs from AsyncStorage
async function getNotificationIds(habitId) {
  try {
    const value = await AsyncStorage.getItem(`notification_${habitId}`);
    if (!value) return [];
    
    const ids = value.startsWith('[') ? JSON.parse(value) : [value];
    console.log(`🔔 Retrieved ${ids.length} notification IDs for habit: ${habitId}`);
    return ids;
  } catch (error) {
    console.error('🔔 Error getting notification IDs:', error);
    return [];
  }
}

// ---------------------------------
// NOTIFICATION SCHEDULING & MANAGEMENT
// ---------------------------------

// Cancel existing notifications for a habit
export async function cancelHabitNotifications(habitId) {
  console.log(`🔔 Cancelling notifications for habit: ${habitId}`);
  
  try {
    // Get existing notification IDs
    const notificationIds = await getNotificationIds(habitId);
    
    if (notificationIds.length > 0) {
      // Cancel each notification
      for (const id of notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      
      // Remove stored notification IDs
      await AsyncStorage.removeItem(`notification_${habitId}`);
      
      console.log(`🔔 Cancelled ${notificationIds.length} notifications for habit: ${habitId}`);
    } else {
      console.log(`🔔 No existing notifications found for habit: ${habitId}`);
    }
    
    return true;
  } catch (error) {
    console.error('🔔 Error cancelling notifications:', error);
    return false;
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  try {
    console.log('🔔 Cancelling all notifications');
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Get and remove all notification keys from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const notificationKeys = keys.filter(key => key.startsWith('notification_'));
    
    if (notificationKeys.length > 0) {
      await AsyncStorage.multiRemove(notificationKeys);
      console.log(`🔔 Removed ${notificationKeys.length} notification entries from storage`);
    }
    
    return true;
  } catch (error) {
    console.error('🔔 Error cancelling all notifications:', error);
    return false;
  }
}

// Schedule a notification for a habit
export async function scheduleHabitReminder(habit, timeString, isNewHabit = false) {
  if (!habit || !habit.id || !timeString) {
    console.error('🔔 Invalid habit or time string');
    return null;
  }
  
  console.log(`🔔 Scheduling reminder for: ${habit.title}`);
  
  try {
    // Cancel any existing notifications for this habit first
    await cancelHabitNotifications(habit.id);
    
    // If reminders aren't enabled, exit early
    if (!habit.reminderEnabled) {
      console.log(`🔔 Reminders not enabled for: ${habit.title}`);
      return null;
    }
    
    // Parse the time string (format: HH:MM)
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      console.error(`🔔 Invalid time format: ${timeString}`);
      return null;
    }
    
    // Map of day abbreviations to indices (0=Sunday, 1=Monday, etc.)
    const dayMapping = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    
    // Get current date and time
    const now = new Date();
    const todayIndex = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Find the next scheduled day
    let nextDayIndex = -1;
    let daysUntilNext = Infinity;
    
    // Look through habit frequency days to find the next occurrence
    for (const day of habit.frequency) {
      const dayIndex = dayMapping[day];
      
      // Calculate days until this occurrence
      let daysUntil = (dayIndex - todayIndex + 7) % 7;
      
      // If it's today and the time has already passed, move to next week
      if (daysUntil === 0) {
        if ((currentHour > hours) || (currentHour === hours && currentMinute >= minutes)) {
          daysUntil = 7;
        }
      }
      
      // Keep track of the earliest upcoming day
      if (daysUntil < daysUntilNext) {
        daysUntilNext = daysUntil;
        nextDayIndex = dayIndex;
      }
    }
    
    // If no valid day was found, exit
    if (nextDayIndex === -1) {
      console.log(`🔔 No valid days found in habit frequency: ${habit.frequency}`);
      return [];
    }
    
    // Get day name for logging
    const nextDayName = Object.keys(dayMapping).find(key => dayMapping[key] === nextDayIndex);
    
    // Calculate the next occurrence date
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + daysUntilNext);
    targetDate.setHours(hours, minutes, 0, 0); // Set exact time, clear seconds and ms
    
    // Log the scheduled time
    const formattedDate = targetDate.toLocaleDateString();
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    console.log(`🔔 Next reminder for ${habit.title}: ${nextDayName} at ${formattedDate} ${formattedTime}`);
    
    // Calculate minutes until the notification
    const minutesFromNow = Math.round((targetDate - now) / (1000 * 60));
    console.log(`🔔 This is ${minutesFromNow} minutes from now`);
    
    // CRUCIAL FIX: For new habits, if the reminder is set to less than 5 minutes from now,
    // push it to the same time tomorrow to prevent immediate notifications
    if (isNewHabit && minutesFromNow < 5) {
      console.log(`🔔 New habit with very soon reminder (${minutesFromNow} minutes). Rescheduling for tomorrow.`);
      targetDate.setDate(targetDate.getDate() + 1);
      console.log(`🔔 Updated to: ${targetDate.toLocaleString()}`);
    }
    
    // Get a motivational message
    const motivationalMessage = getRandomMessage();
    
    // Schedule the notification using an exact date trigger
    const notificationIds = [];
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Time for: ${habit.title}`,
        body: habit.description 
          ? `${habit.description}\n\n${motivationalMessage}` 
          : motivationalMessage,
        data: { 
          habitId: habit.id,
          day: nextDayName,
          isScheduled: true // Mark as explicitly scheduled to distinguish from immediate notifications
        },
        sound: true,
      },
      trigger: {
        date: targetDate,
        // Ensure it doesn't fire immediately
        channelId: 'habit-reminders',
      },
    });
    
    console.log(`🔔 Scheduled notification with ID: ${identifier} for ${targetDate.toLocaleString()}`);
    notificationIds.push(identifier);
    
    // Save notification IDs to AsyncStorage
    await saveNotificationIds(habit.id, notificationIds);
    
    return notificationIds;
  } catch (error) {
    console.error(`🔔 Error scheduling notification for ${habit?.title || 'unknown habit'}:`, error);
    return null;
  }
}

// Schedule a notification for a preset habit
export async function schedulePresetHabitReminder(habit, isNewHabit = true) {
  console.log(`🔔 Scheduling preset habit reminder for: ${habit.title}`);
  
  try {
    if (habit.reminderEnabled && habit.reminderTime) {
      // Always use true for isNewHabit to force the system to treat preset habits as new
      return await scheduleHabitReminder(habit, habit.reminderTime, true);
    } else {
      console.log(`🔔 Preset habit ${habit.title} doesn't have reminders enabled`);
      return null;
    }
  } catch (error) {
    console.error(`🔔 Error scheduling preset habit reminder for ${habit.title}:`, error);
    return null;
  }
}

// Schedule achievement notification
export async function scheduleAchievementNotification(habit, streakCount, isNewHabit = false) {
  // Don't show achievement notifications for new habits or small streaks
  if (streakCount < 3 || isNewHabit) {
    console.log(`🔔 Skipping achievement notification for ${habit.title} (streak: ${streakCount}, isNew: ${isNewHabit})`);
    return null;
  }
  
  try {
    // Schedule notification for 30 minutes in the future to avoid immediate display
    const notificationDate = new Date();
    notificationDate.setMinutes(notificationDate.getMinutes() + 30);
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${streakCount} Day Streak! 🔥`,
        body: `Amazing! You've kept up your "${habit.title}" habit for ${streakCount} days in a row!`,
        data: { 
          habitId: habit.id, 
          type: 'achievement',
          isScheduled: true
        },
        sound: true,
      },
      trigger: {
        date: notificationDate,
        channelId: 'habit-reminders',
      },
    });
    
    console.log(`🔔 Achievement notification scheduled for ${notificationDate.toLocaleString()}`);
    return identifier;
  } catch (error) {
    console.error(`🔔 Error scheduling achievement notification:`, error);
    return null;
  }
}

// ---------------------------------
// NOTIFICATION HANDLING
// ---------------------------------

// Setup notification handlers
export function setupNotificationHandlers() {
  console.log('🔔 Setting up notification handlers');
  
  // When a notification is received while app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('🔔 Notification received in foreground:', notification.request.identifier);
  });

  // When user interacts with a notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    console.log('🔔 User interacted with notification:', data);
    
    // Handle habit completion or rescheduling here if needed
  });

  return () => {
    // Return cleanup function
    Notifications.removeNotificationSubscription(foregroundSubscription);
    Notifications.removeNotificationSubscription(responseSubscription);
  };
}

// List all scheduled notifications (for debugging)
export async function listScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`🔔 Currently scheduled notifications: ${notifications.length}`);
    
    notifications.forEach((notification, index) => {
      const title = notification.content.title;
      const trigger = notification.trigger;
      
      console.log(`🔔 [${index + 1}] "${title}"`);
      
      if (trigger.date) {
        const date = new Date(trigger.date);
        const minutesFromNow = Math.round((date - new Date()) / (1000 * 60));
        console.log(`   Scheduled for: ${date.toLocaleString()} (${minutesFromNow} minutes from now)`);
      } else {
        console.log(`   Trigger: ${JSON.stringify(trigger)}`);
      }
    });
    
    return notifications;
  } catch (error) {
    console.error('🔔 Error listing notifications:', error);
    return [];
  }
}

// Initialize the notification system
export async function initializeNotifications() {
  console.log('🔔 Initializing notification system');
  
  try {
    // Request permissions
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log('🔔 Notification system initialization aborted: no permission');
      return false;
    }
    
    // Setup notification handlers
    setupNotificationHandlers();
    
    console.log('🔔 Notification system initialized successfully');
    return true;
  } catch (error) {
    console.error('🔔 Error initializing notification system:', error);
    return false;
  }
}

// Schedule a test notification (for debugging)
export async function scheduleTestNotification(seconds = 5) {
  console.log(`🔔 Scheduling test notification for ${seconds} seconds from now`);
  
  try {
    const now = new Date();
    now.setSeconds(now.getSeconds() + seconds);
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: `This should appear ${seconds} seconds after scheduling`,
        data: { test: true, isScheduled: true },
      },
      trigger: {
        date: now,
        channelId: 'habit-reminders',
      },
    });
    
    console.log(`🔔 Test notification scheduled with ID: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error('🔔 Error scheduling test notification:', error);
    return null;
  }
}

// Reschedule notifications for all habits
export async function rescheduleAllNotifications() {
  console.log('🔔 Rescheduling all notifications');
  
  try {
    // First cancel all existing notifications
    await cancelAllNotifications();
    
    // Get all habits
    const habitsData = await AsyncStorage.getItem('habits');
    if (!habitsData) {
      console.log('🔔 No habits found to reschedule notifications for');
      return true;
    }
    
    const habits = JSON.parse(habitsData);
    let count = 0;
    
    // Schedule notifications for each habit with reminders enabled
    for (const habit of habits) {
      if (habit.reminderEnabled && habit.reminderTime) {
        await scheduleHabitReminder(habit, habit.reminderTime);
        count++;
      }
    }
    
    console.log(`🔔 Successfully rescheduled notifications for ${count} habits`);
    return true;
  } catch (error) {
    console.error('🔔 Error rescheduling all notifications:', error);
    return false;
  }
}
