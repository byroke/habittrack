// filepath: /home/pirat/my-expo-app/utils/presetHabits.ts
import { Habit } from './localStorage';
import { IconName } from './localStorage';

/**
 * Preset habits that users can quickly add to their habits list
 * These are organized by category for easier browsing
 */
export type PresetHabit = Omit<Habit, 'id' | 'createdAt' | 'completedDates' | 'currentStreak' | 'longestStreak' | 'completed'>;

// Health category presets
const healthPresets: PresetHabit[] = [
  {
    title: 'Drink 8 glasses of water',
    description: 'Stay hydrated by drinking at least 8 glasses of water daily',
    category: 'Health',
    icon: 'water' as IconName,
    color: '#4FC3F7',
    frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminderEnabled: true,
    reminderTime: '09:00'
  },
  {
    title: 'Take vitamins',
    description: 'Don\'t forget your daily supplements',
    category: 'Health',
    icon: 'pill' as IconName,
    color: '#FF6B6B',
    frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminderEnabled: true,
    reminderTime: '08:00'
  },
  {
    title: 'Get 8 hours of sleep',
    description: 'Ensure proper rest by sleeping at least 8 hours',
    category: 'Health',
    icon: 'sleep' as IconName,
    color: '#9575CD',
    frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminderEnabled: true,
    reminderTime: '22:00'
  }
];

// Fitness category presets
const fitnessPresets: PresetHabit[] = [
  {
    title: 'Exercise 30 minutes',
    description: 'Get at least 30 minutes of physical activity',
    category: 'Fitness',
    icon: 'weight-lifter' as IconName,
    color: '#FF9F40',
    frequency: ['Mon', 'Wed', 'Fri'],
    reminderEnabled: true,
    reminderTime: '17:00'
  },
  {
    title: 'Go for a walk',
    description: 'Take a 15-minute walk outside',
    category: 'Fitness',
    icon: 'walk' as IconName,
    color: '#FF9F40',
    frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminderEnabled: true,
    reminderTime: '12:00'
  },
  {
    title: 'Stretch routine',
    description: 'Perform your stretching exercises',
    category: 'Fitness',
    icon: 'yoga' as IconName,
    color: '#FF9F40',
    frequency: ['Mon', 'Wed', 'Fri', 'Sun'],
    reminderEnabled: true,
    reminderTime: '07:00'
  }
];

// Mindfulness category presets
const mindfulnessPresets: PresetHabit[] = [
  {
    title: 'Meditate',
    description: '10 minutes of mindful meditation',
    category: 'Mindfulness',
    icon: 'meditation' as IconName,
    color: '#9966FF',
    frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminderEnabled: true,
    reminderTime: '07:30'
  },
  {
    title: 'Gratitude journal',
    description: 'Write down 3 things you are grateful for today',
    category: 'Mindfulness',
    icon: 'notebook' as IconName,
    color: '#9966FF',
    frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminderEnabled: true,
    reminderTime: '21:00'
  },
  {
    title: 'Digital detox',
    description: 'Spend 1 hour without electronic devices',
    category: 'Mindfulness',
    icon: 'cellphone-off' as IconName,
    color: '#9966FF',
    frequency: ['Mon', 'Wed', 'Fri', 'Sun'],
    reminderEnabled: true,
    reminderTime: '19:00'
  }
];

// Productivity category presets
const productivityPresets: PresetHabit[] = [
  {
    title: 'Plan your day',
    description: 'Take 10 minutes to plan your day each morning',
    category: 'Productivity',
    icon: 'calendar-check' as IconName,
    color: '#4BC0C0',
    frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    reminderEnabled: true,
    reminderTime: '07:00'
  },
  {
    title: 'Deep work session',
    description: '90 minutes of focused, distraction-free work',
    category: 'Productivity',
    icon: 'lightning-bolt' as IconName,
    color: '#4BC0C0',
    frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    reminderEnabled: true,
    reminderTime: '10:00'
  },
  {
    title: 'Inbox zero',
    description: 'Process and clear your email inbox',
    category: 'Productivity',
    icon: 'email-outline' as IconName,
    color: '#4BC0C0',
    frequency: ['Mon', 'Wed', 'Fri'],
    reminderEnabled: true,
    reminderTime: '16:00'
  }
];

// Learning category presets
const learningPresets: PresetHabit[] = [
  {
    title: 'Read 20 pages',
    description: 'Read at least 20 pages of a book',
    category: 'Learning',
    icon: 'book-open-page-variant' as IconName,
    color: '#36A2EB',
    frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminderEnabled: true,
    reminderTime: '21:30'
  },
  {
    title: 'Practice a new language',
    description: '15 minutes of language learning practice',
    category: 'Learning',
    icon: 'translate' as IconName,
    color: '#36A2EB',
    frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    reminderEnabled: true,
    reminderTime: '18:00'
  },
  {
    title: 'Listen to a podcast',
    description: 'Listen to an educational podcast episode',
    category: 'Learning',
    icon: 'podcast' as IconName,
    color: '#36A2EB',
    frequency: ['Mon', 'Wed', 'Fri'],
    reminderEnabled: true,
    reminderTime: '17:30'
  }
];

// Social category presets
const socialPresets: PresetHabit[] = [
  {
    title: 'Call a family member',
    description: 'Stay connected with your family',
    category: 'Social',
    icon: 'phone' as IconName,
    color: '#FFCE56',
    frequency: ['Sun'],
    reminderEnabled: true,
    reminderTime: '18:00'
  },
  {
    title: 'Connect with a friend',
    description: 'Reach out to a friend you haven\'t spoken to recently',
    category: 'Social',
    icon: 'account-group' as IconName,
    color: '#FFCE56',
    frequency: ['Wed', 'Sat'],
    reminderEnabled: true,
    reminderTime: '19:00'
  },
  {
    title: 'Random act of kindness',
    description: 'Do something nice for someone else',
    category: 'Social',
    icon: 'hand-heart' as IconName,
    color: '#FFCE56',
    frequency: ['Mon', 'Wed', 'Fri'],
    reminderEnabled: true,
    reminderTime: '12:00'
  }
];

// Combine all presets organized by category for easy access
export const PRESET_HABITS_BY_CATEGORY = {
  Health: healthPresets,
  Fitness: fitnessPresets,
  Mindfulness: mindfulnessPresets,
  Productivity: productivityPresets,
  Learning: learningPresets,
  Social: socialPresets
};

// All presets in a single flat array
export const ALL_PRESET_HABITS = [
  ...healthPresets,
  ...fitnessPresets,
  ...mindfulnessPresets,
  ...productivityPresets,
  ...learningPresets,
  ...socialPresets
];

/**
 * Convert a preset habit to a full habit by adding required fields
 * @param preset The preset habit to convert
 * @returns A complete habit with all required fields
 */
export const presetToHabit = (preset: PresetHabit): Habit => {
  return {
    ...preset,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    completedDates: [],
    currentStreak: 0,
    longestStreak: 0
  };
};
