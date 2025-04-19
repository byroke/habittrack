/**
 * FIXED Notification System for Habit Tracking App
 * This completely redesigned system prevents immediate notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notifications for foreground display
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

/**
 * Get a random motivational message
 * @returns {string} A random motivational message
 */
function getRandomMotivationalMessage() {
  const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
  return MOTIVATIONAL_MESSAGES[randomIndex];
}

/**
 * Request notification permissions
 */
export async function registerForPushNotificationsAsync() {
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

    // Create notification channels for Android
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
    console.error('Error requesting permissions:', error);
    return false;
  }
}

/**
 * Save notification IDs for a habit to AsyncStorage
 */
async function saveNotificationIds(habitId, notificationIds) {
  try {
    await AsyncStorage.setItem(
      `notification_${habitId}`,
      JSON.stringify(notificationIds)
    );
  } catch (error) {
    // Silent error handling for production
  }
}

/**
 * Get notification IDs for a habit from AsyncStorage
 */
async function getNotificationIds(habitId) {
  try {
    const value = await AsyncStorage.getItem(`notification_${habitId}`);
    if (!value) return [];
    
    return value.startsWith('[') ? JSON.parse(value) : [value];
  } catch (error) {
    return [];
  }
}

/**
 * Cancel a habit's notifications
 */
export async function cancelHabitReminder(habitId) {
  try {
    const notificationIds = await getNotificationIds(habitId);
    
    if (notificationIds.length > 0) {
      for (const id of notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      
      await AsyncStorage.removeItem(`notification_${habitId}`);
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Schedule a notification for a habit
 * @param {Object} habit The habit object
 * @param {string} timeString The time string in "HH:MM" format
 * @param {boolean} isNewHabit Whether this is a new habit being created
 * @returns {Promise<string[]>} Array of notification IDs
 */
export async function scheduleHabitReminder(habit, timeString, isNewHabit = false) {
  try {
    // Cancel any existing notifications first
    await cancelHabitReminder(habit.id);
    
    if (!habit.reminderEnabled) {
      return null;
    }
    
    // Parse the time string
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Day mapping for calculations
    const dayMapping = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    
    const now = new Date();
    const todayIndex = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Find the next occurrence day
    let earliestDayIndex = -1;
    let earliestDaysUntil = 8;
    
    for (const day of habit.frequency) {
      const dayIndex = dayMapping[day];
      let daysUntil = (dayIndex - todayIndex + 7) % 7;
      
      // If it's today and the time has already passed, schedule for next week
      if (daysUntil === 0) {
        const nowInMinutes = currentHour * 60 + currentMinute;
        const targetInMinutes = hours * 60 + minutes;

        if (targetInMinutes - nowInMinutes < 15) {
          // If the target time is within 15 minutes or in the past, schedule for the next week
          daysUntil = 7;
        }
      }
      
      if (daysUntil < earliestDaysUntil) {
        earliestDaysUntil = daysUntil;
        earliestDayIndex = dayIndex;
      }
    }
    
    if (earliestDayIndex === -1) {
      return [];
    }
    
    const dayName = Object.keys(dayMapping).find(key => dayMapping[key] === earliestDayIndex);
    
    // Calculate notification date
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + earliestDaysUntil);
    targetDate.setHours(hours, minutes, 0, 0);
    
    // For new habits, if scheduled under 15 minutes from now, push to tomorrow
    if (isNewHabit && ((targetDate - now) / 60000) < 15) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    // Make sure we don't schedule for the past
    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    // Get a motivational message
    const motivationalMessage = getRandomMotivationalMessage();
    
    // Create notification content
    const content = {
      title: `Time for: ${habit.title}`,
      body: habit.description 
        ? `${habit.description}\n\n${motivationalMessage}` 
        : motivationalMessage,
      data: { 
        habitId: habit.id, 
        day: dayName,
        isScheduled: true
      },
      sound: true,
    };
    
    // Create date-based trigger for reliability
    const trigger = {
      date: targetDate,
      channelId: Platform.OS === 'android' ? 'habit-reminders' : undefined,
    };
    
    // Schedule the notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });
    
    // Save the notification ID
    const notificationIds = [identifier];
    await saveNotificationIds(habit.id, notificationIds);
    
    return notificationIds;
  } catch (error) {
    return null;
  }
}

/**
 * Schedule a notification for a preset habit
 */
export async function schedulePresetHabitNotification(habit, isNewHabit = true) {
  try {
    // For preset habits, always force isNewHabit to true
    if (habit.reminderEnabled && habit.reminderTime) {
      return await scheduleHabitReminder(habit, habit.reminderTime, true);
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Schedule a notification for an achievement
 */
export async function scheduleAchievementNotification(habit, streakCount, isNewHabit = false) {
  // Skip for new habits or small streaks
  if (streakCount < 3 || isNewHabit) {
    return null;
  }
  
  try {
    // Schedule for 30 minutes in the future to avoid immediate display
    const notificationDate = new Date();
    notificationDate.setMinutes(notificationDate.getMinutes() + 30);
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${streakCount} Day Streak! 🔥`,
        body: `Amazing! You've kept up your "${habit.title}" habit for ${streakCount} days in a row!`,
        data: { habitId: habit.id, type: 'achievement', isScheduled: true },
        sound: true,
      },
      trigger: {
        date: notificationDate,
        channelId: Platform.OS === 'android' ? 'habit-reminders' : undefined,
      },
    });
    
    return identifier;
  } catch (error) {
    return null;
  }
}

/**
 * Schedule a reminder to snooze for a specified number of minutes
 * @param {Object} habit The habit object
 * @param {number} minutes The number of minutes to snooze
 * @returns {Promise<string|null>} The notification ID or null if failed
 */
export async function scheduleSnoozeReminder(habit, minutes) {
  try {
    // Create a date for the future reminder
    const snoozeDate = new Date();
    snoozeDate.setMinutes(snoozeDate.getMinutes() + minutes);
    
    // Schedule the notification to appear after the specified minutes
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${habit.title}`,
        body: `Time to get back to your habit!`,
        data: { habitId: habit.id, type: 'snooze' },
        sound: true,
      },
      trigger: {
        date: snoozeDate,
        channelId: Platform.OS === 'android' ? 'habit-reminders' : undefined,
      },
    });
    
    return identifier;
  } catch (error) {
    return null;
  }
}

/**
 * Setup notification handlers
 */
export function setupNotificationHandler() {
  // For foreground notifications
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    // Silent handling for production
  });
  
  // For notification interactions
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    // Silent handling for production
  });
  
  return () => {
    Notifications.removeNotificationSubscription(foregroundSubscription);
    Notifications.removeNotificationSubscription(responseSubscription);
  };
}

/**
 * Cancel all notifications
 */
export async function cancelAllHabitReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const keys = await AsyncStorage.getAllKeys();
    const notificationKeys = keys.filter(key => key.startsWith('notification_'));
    
    if (notificationKeys.length > 0) {
      await AsyncStorage.multiRemove(notificationKeys);
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Schedule a test notification
 * @param {number} seconds Seconds to wait before showing the notification
 */
export async function scheduleTestNotification(seconds = 5) {
  try {
    const now = new Date();
    now.setSeconds(now.getSeconds() + seconds);
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: `This should appear ${seconds} seconds after scheduling`,
        data: { test: true },
      },
      trigger: {
        date: now,
      },
    });
    
    return identifier;
  } catch (error) {
    return null;
  }
}

/**
 * Initialize the notification system
 */
export async function initializeNotifications() {
  try {
    const permissionsGranted = await registerForPushNotificationsAsync();
    if (permissionsGranted) {
      setupNotificationHandler();
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * List all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`🛠️ Currently scheduled notifications: ${notifications.length}`);
    
    notifications.forEach((notification, index) => {
      const title = notification.content.title;
      const trigger = notification.trigger;
      
      console.log(`🛠️ [${index + 1}] "${title}"`);
      
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
    console.error('🛠️ Error listing notifications:', error);
    return [];
  }
}

/**
 * Schedule a notification with a specified delay
 * @param {Object} habit The habit object
 * @param {number} delayMinutes The delay in minutes for the notification
 * @returns {Promise<string[]>} Array of notification IDs
 */
export async function scheduleNotificationWithDelay(habit, delayMinutes) {
  try {
    // Validate delay
    if (delayMinutes <= 0) {
      return null;
    }

    // Calculate the target date
    const targetDate = new Date();
    targetDate.setMinutes(targetDate.getMinutes() + delayMinutes);

    // Create notification content with motivational message
    const motivationalMessage = getRandomMotivationalMessage();
    const content = {
      title: `Time for: ${habit.title}`,
      body: habit.description ? `${habit.description}\n\n${motivationalMessage}` : motivationalMessage,
      data: { habitId: habit.id, isScheduled: true },
      sound: true,
    };

    // Create notification trigger
    const trigger = {
      date: targetDate,
      channelId: Platform.OS === 'android' ? 'habit-reminders' : undefined,
    };

    // Schedule the notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    // Save the notification ID
    const notificationIds = [identifier];
    await saveNotificationIds(habit.id, notificationIds);

    return notificationIds;
  } catch (error) {
    console.error('Error scheduling notification with delay:', error);
    return null;
  }
}
