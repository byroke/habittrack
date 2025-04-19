import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit } from './localStorage';

// User level and XP types
export interface UserProgress {
  level: number;
  currentXP: number;
  totalXP: number;
  nextLevelXP: number;
}

// Achievement types
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number; // For achievements with progress (0-100)
  maxProgress?: number;
  unlockedAt?: string;
  category: 'streak' | 'completion' | 'creation' | 'special';
}

// Challenge types
export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  date: string; // ISO date string
  type: 'complete_habits' | 'streak' | 'category_focus' | 'time_sensitive';
  requiredCount?: number;
  targetCategory?: string;
}

// Default initial values
const INITIAL_USER_PROGRESS: UserProgress = {
  level: 1,
  currentXP: 0,
  totalXP: 0,
  nextLevelXP: 100
};

// XP rewards for different actions
export const XP_REWARDS = {
  COMPLETE_HABIT: 10,
  MAINTAIN_STREAK: {
    3: 20, // 3-day streak
    7: 50, // 7-day streak
    14: 100, // 14-day streak
    30: 250, // 30-day streak
    60: 500, // 60-day streak
    100: 1000 // 100-day streak
  },
  CREATE_HABIT: 5,
  COMPLETE_DAILY_CHALLENGE: 25,
  UNLOCK_ACHIEVEMENT: 50
};

// Calculate XP required for a given level
export const calculateLevelXP = (level: number): number => {
  return 100 * Math.pow(1.5, level - 1);
};

// Get user progress from storage
export const getUserProgress = async (): Promise<UserProgress> => {
  try {
    const storedProgress = await AsyncStorage.getItem('userProgress');
    if (storedProgress) {
      return JSON.parse(storedProgress);
    }
    return INITIAL_USER_PROGRESS;
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return INITIAL_USER_PROGRESS;
  }
};

// Save user progress to storage
export const saveUserProgress = async (progress: UserProgress): Promise<boolean> => {
  try {
    await AsyncStorage.setItem('userProgress', JSON.stringify(progress));
    return true;
  } catch (error) {
    console.error('Error saving user progress:', error);
    return false;
  }
};

// Add XP to user and level up if needed
export const addXP = async (xpAmount: number): Promise<{
  newProgress: UserProgress;
  leveledUp: boolean;
  levelsGained: number;
}> => {
  const currentProgress = await getUserProgress();
  
  const newTotalXP = currentProgress.totalXP + xpAmount;
  let newCurrentXP = currentProgress.currentXP + xpAmount;
  let newLevel = currentProgress.level;
  let nextLevelXP = currentProgress.nextLevelXP;
  let leveledUp = false;
  let levelsGained = 0;
  
  // Check if user has leveled up
  while (newCurrentXP >= nextLevelXP) {
    newCurrentXP -= nextLevelXP;
    newLevel++;
    levelsGained++;
    leveledUp = true;
    nextLevelXP = calculateLevelXP(newLevel);
  }
  
  const newProgress: UserProgress = {
    level: newLevel,
    currentXP: newCurrentXP,
    totalXP: newTotalXP,
    nextLevelXP
  };
  
  await saveUserProgress(newProgress);
  
  return {
    newProgress,
    leveledUp,
    levelsGained
  };
};

// Default achievements
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_habit',
    title: 'First Steps',
    description: 'Create your first habit',
    icon: 'flag-checkered',
    unlocked: false,
    category: 'creation'
  },
  {
    id: 'habit_collector',
    title: 'Habit Collector',
    description: 'Create 5 different habits',
    icon: 'format-list-bulleted',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
    category: 'creation'
  },
  {
    id: 'first_completion',
    title: 'Day One',
    description: 'Complete your first habit',
    icon: 'check-circle',
    unlocked: false,
    category: 'completion'
  },
  {
    id: 'streak_3',
    title: 'Getting Started',
    description: 'Maintain a 3-day streak for any habit',
    icon: 'fire',
    unlocked: false,
    category: 'streak'
  },
  {
    id: 'streak_7',
    title: 'One Week Wonder',
    description: 'Maintain a 7-day streak for any habit',
    icon: 'fire',
    unlocked: false,
    category: 'streak'
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day streak for any habit',
    icon: 'crown',
    unlocked: false,
    category: 'streak'
  },
  {
    id: 'perfect_day',
    title: 'Perfect Day',
    description: 'Complete all habits scheduled for a day',
    icon: 'star',
    unlocked: false,
    category: 'completion'
  },
  {
    id: 'perfect_week',
    title: 'Perfect Week',
    description: 'Complete all habits every day for a week',
    icon: 'calendar-star',
    unlocked: false,
    category: 'completion'
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Complete a habit before 8 AM',
    icon: 'weather-sunset-up',
    unlocked: false,
    category: 'special'
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete a habit after 10 PM',
    icon: 'weather-night',
    unlocked: false,
    category: 'special'
  }
];

// Get achievements from storage
export const getAchievements = async (): Promise<Achievement[]> => {
  try {
    const storedAchievements = await AsyncStorage.getItem('achievements');
    if (storedAchievements) {
      return JSON.parse(storedAchievements);
    }
    return DEFAULT_ACHIEVEMENTS;
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return DEFAULT_ACHIEVEMENTS;
  }
};

// Save achievements to storage
export const saveAchievements = async (achievements: Achievement[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem('achievements', JSON.stringify(achievements));
    return true;
  } catch (error) {
    console.error('Error saving achievements:', error);
    return false;
  }
};

// Unlock an achievement by id
export const unlockAchievement = async (achievementId: string): Promise<{
  achievement: Achievement | null;
  alreadyUnlocked: boolean;
}> => {
  const achievements = await getAchievements();
  const achievementIndex = achievements.findIndex(a => a.id === achievementId);
  
  if (achievementIndex === -1) {
    return { achievement: null, alreadyUnlocked: false };
  }
  
  const achievement = achievements[achievementIndex];
  
  // Check if already unlocked
  if (achievement.unlocked) {
    return { achievement, alreadyUnlocked: true };
  }
  
  // Unlock the achievement
  achievements[achievementIndex] = {
    ...achievement,
    unlocked: true,
    unlockedAt: new Date().toISOString()
  };
  
  await saveAchievements(achievements);
  
  // Add XP for unlocking achievement
  await addXP(XP_REWARDS.UNLOCK_ACHIEVEMENT);
  
  return { achievement: achievements[achievementIndex], alreadyUnlocked: false };
};

// Update achievement progress
export const updateAchievementProgress = async (achievementId: string, progress: number): Promise<{
  achievement: Achievement | null;
  unlocked: boolean;
}> => {
  const achievements = await getAchievements();
  const achievementIndex = achievements.findIndex(a => a.id === achievementId);
  
  if (achievementIndex === -1) {
    return { achievement: null, unlocked: false };
  }
  
  const achievement = achievements[achievementIndex];
  
  // Skip if already unlocked
  if (achievement.unlocked) {
    return { achievement, unlocked: false };
  }
  
  // Update progress
  const updatedProgress = Math.min(progress, achievement.maxProgress || 100);
  let unlocked = false;
  
  const updatedAchievement = {
    ...achievement,
    progress: updatedProgress
  };
  
  // Check if should unlock
  if (updatedProgress >= (achievement.maxProgress || 100)) {
    updatedAchievement.unlocked = true;
    updatedAchievement.unlockedAt = new Date().toISOString();
    unlocked = true;
  }
  
  achievements[achievementIndex] = updatedAchievement;
  await saveAchievements(achievements);
  
  // Add XP if unlocked
  if (unlocked) {
    await addXP(XP_REWARDS.UNLOCK_ACHIEVEMENT);
  }
  
  return { achievement: updatedAchievement, unlocked };
};

// Generate daily challenges
export const generateDailyChallenges = async (habits: Habit[]): Promise<DailyChallenge[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Check if we already have challenges for today
    const storedChallenges = await AsyncStorage.getItem('dailyChallenges');
    if (storedChallenges) {
      const challenges: DailyChallenge[] = JSON.parse(storedChallenges);
      const todayChallenges = challenges.filter(c => c.date === today);
      if (todayChallenges.length > 0) {
        return todayChallenges;
      }
    }
    
    // Generate new challenges
    const categories = [...new Set(habits.map(h => h.category))];
    const newChallenges: DailyChallenge[] = [];
    
    // Challenge 1: Complete X habits today
    const habitCount = Math.min(habits.length, Math.max(2, Math.floor(habits.length / 2)));
    newChallenges.push({
      id: `complete_${today}`,
      title: `Daily Completions`,
      description: `Complete ${habitCount} habits today`,
      xpReward: 25,
      completed: false,
      date: today,
      type: 'complete_habits',
      requiredCount: habitCount
    });
    
    // Challenge 2: Focus on a specific category
    if (categories.length > 0) {
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const categoryHabits = habits.filter(h => h.category === randomCategory);
      
      if (categoryHabits.length > 0) {
        const requiredCount = Math.min(categoryHabits.length, 2);
        newChallenges.push({
          id: `category_${today}`,
          title: `${randomCategory} Focus`,
          description: `Complete ${requiredCount} ${randomCategory} habits today`,
          xpReward: 30,
          completed: false,
          date: today,
          type: 'category_focus',
          requiredCount,
          targetCategory: randomCategory
        });
      }
    }
    
    // Save the new challenges
    await AsyncStorage.setItem('dailyChallenges', JSON.stringify(newChallenges));
    
    return newChallenges;
  } catch (error) {
    console.error('Error generating daily challenges:', error);
    return [];
  }
};

// Complete a challenge
export const completeChallenge = async (challengeId: string): Promise<{
  success: boolean;
  xpGained: number;
}> => {
  try {
    const storedChallenges = await AsyncStorage.getItem('dailyChallenges');
    if (!storedChallenges) {
      return { success: false, xpGained: 0 };
    }
    
    const challenges: DailyChallenge[] = JSON.parse(storedChallenges);
    const challengeIndex = challenges.findIndex(c => c.id === challengeId);
    
    if (challengeIndex === -1 || challenges[challengeIndex].completed) {
      return { success: false, xpGained: 0 };
    }
    
    // Mark as completed
    const xpReward = challenges[challengeIndex].xpReward;
    challenges[challengeIndex].completed = true;
    
    // Save updated challenges
    await AsyncStorage.setItem('dailyChallenges', JSON.stringify(challenges));
    
    // Add XP reward
    await addXP(xpReward);
    
    return { success: true, xpGained: xpReward };
  } catch (error) {
    console.error('Error completing challenge:', error);
    return { success: false, xpGained: 0 };
  }
};

// Check and update achievements based on current app state
export const checkAndUpdateAchievements = async (habits: Habit[]): Promise<Achievement[]> => {
  const achievements = await getAchievements();
  const updatedAchievements = [...achievements];
  let changed = false;
  
  // Check "First habit" achievement
  if (habits.length > 0) {
    const firstHabitAchievement = achievements.find(a => a.id === 'first_habit');
    if (firstHabitAchievement && !firstHabitAchievement.unlocked) {
      await unlockAchievement('first_habit');
      changed = true;
    }
  }
  
  // Check "Habit collector" achievement
  const habitCollectorAchievement = achievements.find(a => a.id === 'habit_collector');
  if (habitCollectorAchievement && !habitCollectorAchievement.unlocked) {
    await updateAchievementProgress('habit_collector', habits.length);
    changed = true;
  }
  
  // Check streak achievements
  const maxStreak = Math.max(...habits.map(h => h.longestStreak || 0));
  
  if (maxStreak >= 3) {
    const streak3Achievement = achievements.find(a => a.id === 'streak_3');
    if (streak3Achievement && !streak3Achievement.unlocked) {
      await unlockAchievement('streak_3');
      changed = true;
    }
  }
  
  if (maxStreak >= 7) {
    const streak7Achievement = achievements.find(a => a.id === 'streak_7');
    if (streak7Achievement && !streak7Achievement.unlocked) {
      await unlockAchievement('streak_7');
      changed = true;
    }
  }
  
  if (maxStreak >= 30) {
    const streak30Achievement = achievements.find(a => a.id === 'streak_30');
    if (streak30Achievement && !streak30Achievement.unlocked) {
      await unlockAchievement('streak_30');
      changed = true;
    }
  }
  
  // Return updated achievements if changed
  if (changed) {
    return await getAchievements();
  }
  
  return achievements;
};

// Get streak milestone XP reward
export const getStreakXPReward = (streak: number): number => {
  const milestones = Object.keys(XP_REWARDS.MAINTAIN_STREAK).map(Number).sort((a, b) => b - a);
  
  for (const milestone of milestones) {
    if (streak >= milestone) {
      return XP_REWARDS.MAINTAIN_STREAK[milestone as keyof typeof XP_REWARDS.MAINTAIN_STREAK];
    }
  }
  
  return XP_REWARDS.COMPLETE_HABIT;
};

// Check if a given date has all scheduled habits completed
export const checkPerfectDay = async (date: string, habits: Habit[]): Promise<boolean> => {
  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
  
  // Get habits scheduled for this day
  const scheduledHabits = habits.filter(habit => habit.frequency.includes(dayName));
  if (scheduledHabits.length === 0) return false;
  
  // Check if all scheduled habits were completed on this day
  const allCompleted = scheduledHabits.every(habit => 
    habit.completedDates && habit.completedDates.includes(date)
  );
  
  if (allCompleted) {
    // Unlock perfect day achievement if not already unlocked
    const achievements = await getAchievements();
    const perfectDayAchievement = achievements.find(a => a.id === 'perfect_day');
    if (perfectDayAchievement && !perfectDayAchievement.unlocked) {
      await unlockAchievement('perfect_day');
    }
  }
  
  return allCompleted;
};
