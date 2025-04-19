import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  Switch,
  Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { scheduleHabitReminder, cancelHabitReminder, schedulePresetHabitNotification } from '../../../utils/fixedNotifications';
import { Habit, IconName } from '../../../utils/localStorage';
import { PresetHabit, presetToHabit } from '../../../utils/presetHabits';
import PresetHabitsModal from '../../components/PresetHabitsModal';
// Import gamification utilities and components
import { 
  addXP, 
  getUserProgress, 
  getAchievements, 
  checkAndUpdateAchievements,
  getStreakXPReward,
  generateDailyChallenges,
  XP_REWARDS
} from '../../../utils/gamificationUtils';
import GamificationPanel from '../../components/GamificationPanel';
import LevelUpNotification from '../../components/LevelUpNotification';
import XpReward from '../../components/XpReward';

// Category options with corresponding icons and colors
const CATEGORIES = [
  { name: 'Health', icon: 'heart-pulse' as IconName, color: '#FF6B6B' },
  { name: 'Productivity', icon: 'lightning-bolt' as IconName, color: '#4BC0C0' },
  { name: 'Mindfulness', icon: 'meditation' as IconName, color: '#9966FF' },
  { name: 'Learning', icon: 'book-open-page-variant' as IconName, color: '#36A2EB' },
  { name: 'Fitness', icon: 'weight-lifter' as IconName, color: '#FF9F40' },
  { name: 'Social', icon: 'account-group' as IconName, color: '#FFCE56' },
  { name: 'Other', icon: 'star' as IconName, color: '#6200ee' }
];

// Day options for frequency selection
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HabitManagementPage() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [filteredHabits, setFilteredHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  
  // Animation refs for button effects
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Gamification states
  const [isGamificationPanelVisible, setIsGamificationPanelVisible] = useState<boolean>(false);
  const [showLevelUp, setShowLevelUp] = useState<boolean>(false);
  const [levelUpDetails, setLevelUpDetails] = useState<{ level: number }>({ level: 1 });
  const [xpRewards, setXpRewards] = useState<Array<{id: string, amount: number, message?: string}>>([]);
  const [userLevel, setUserLevel] = useState<number>(1);
  const [dailyChallenges, setDailyChallenges] = useState<any[]>([]);
  
  // Form state for adding/editing habits
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [showReminderTimeModal, setShowReminderTimeModal] = useState<boolean>(false);
  const [showPresetHabitsModal, setShowPresetHabitsModal] = useState<boolean>(false);
  const [currentHabit, setCurrentHabit] = useState<Habit>({
    id: '',
    title: '',
    description: '',
    category: 'Other',
    icon: 'star',
    color: '#6200ee',
    createdAt: new Date().toISOString(),
    frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    completedDates: [],
    currentStreak: 0,
    longestStreak: 0,
    reminderEnabled: false,
    reminderTime: '20:00'
  });
  
  // Reserved for future features

  // Load habits from storage when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [])
  );

  // Load habits from AsyncStorage
  const loadHabits = async () => {
    setLoading(true);
    try {
      const storedHabits = await AsyncStorage.getItem('habits');
      let parsedHabits = [];
      
      if (storedHabits) {
        parsedHabits = JSON.parse(storedHabits);
        setHabits(parsedHabits);
        setFilteredHabits(parsedHabits);
      }
      
      // Load user progress (level, XP)
      const userProgress = await getUserProgress();
      setUserLevel(userProgress.level);
      
      // Check and update achievements
      await checkAndUpdateAchievements(parsedHabits);
      
      // Generate or load daily challenges
      const challenges = await generateDailyChallenges(parsedHabits);
      setDailyChallenges(challenges);
      
    } catch (error) {
      console.error('Error loading habits:', error);
      Alert.alert('Error', 'Failed to load your habits.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Save habits to AsyncStorage
  const saveHabits = async (updatedHabits: Habit[]) => {
    try {
      await AsyncStorage.setItem('habits', JSON.stringify(updatedHabits));
    } catch (error) {
      console.error('Error saving habits:', error);
      Alert.alert('Error', 'Failed to save your habits.');
    }
  };

  // Add a new habit
  const addHabit = async () => {
    if (currentHabit.title.trim() === '') {
      Alert.alert('Error', 'Habit name cannot be empty.');
      return;
    }

    const newHabit: Habit = {
      ...currentHabit,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    // Schedule notifications if reminders are enabled
    if (newHabit.reminderEnabled && newHabit.reminderTime) {
      try {
        // Schedule notifications with isNewHabit=true to ensure it doesn't send immediately
        await scheduleHabitReminder(newHabit, newHabit.reminderTime, true);
        console.log(`🔔 Scheduled reminders for new habit: ${newHabit.title}`);
      } catch (error) {
        console.error('Error scheduling notifications:', error);
      }
    }

    const updatedHabits = [...habits, newHabit];
    setHabits(updatedHabits);
    setFilteredHabits(applyFilters(updatedHabits, activeFilter, searchQuery));
    saveHabits(updatedHabits);
    resetForm();
    setIsModalVisible(false);
  };

  // Update an existing habit
  const updateHabit = async () => {
    if (currentHabit.title.trim() === '') {
      Alert.alert('Error', 'Habit name cannot be empty.');
      return;
    }

    // Handle reminder notifications
    try {
      // Cancel existing notifications for this habit
      await cancelHabitReminder(currentHabit.id);
      
      // Schedule new notifications if reminders are enabled
      if (currentHabit.reminderEnabled && currentHabit.reminderTime) {
        // Convert frequency days to day indices (0 = Sun, 1 = Mon, etc.)
        const dayIndices = currentHabit.frequency.map(day => {
          const daysMap: {[key: string]: number} = {
            'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 
            'Thu': 4, 'Fri': 5, 'Sat': 6
          };
          return daysMap[day];
        });
        
        await scheduleHabitReminder(currentHabit, currentHabit.reminderTime);
      }
    } catch (error) {
      console.error('Error updating notifications:', error);
    }

    const updatedHabits = habits.map(habit => 
      habit.id === currentHabit.id ? currentHabit : habit
    );

    setHabits(updatedHabits);
    setFilteredHabits(applyFilters(updatedHabits, activeFilter, searchQuery));
    saveHabits(updatedHabits);
    resetForm();
    setIsModalVisible(false);
  };

  // Delete a habit with confirmation
  const deleteHabit = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this habit? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: async () => {
            // Cancel any scheduled notifications for this habit
            try {
              await cancelHabitReminder(id);
            } catch (error) {
              console.error('Error cancelling notifications:', error);
            }
            
            const updatedHabits = habits.filter(habit => habit.id !== id);
            setHabits(updatedHabits);
            setFilteredHabits(applyFilters(updatedHabits, activeFilter, searchQuery));
            saveHabits(updatedHabits);
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Reset form to default values
  const resetForm = () => {
    setCurrentHabit({
      id: '',
      title: '',
      description: '',
      category: 'Other',
      icon: 'star',
      color: '#6200ee',
      createdAt: new Date().toISOString(),
      frequency: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      completedDates: [],
      currentStreak: 0,
      longestStreak: 0,
      reminderEnabled: false,
      reminderTime: '20:00'
    });
    setIsEditMode(false);
  };

  // Handle selecting a preset habit
  const handleSelectPreset = async (preset: PresetHabit) => {
    // Convert the preset to a full habit
    const newHabit = presetToHabit(preset);
    
    // Schedule notifications if reminders are enabled
    if (newHabit.reminderEnabled && newHabit.reminderTime) {
      try {
        // Schedule notifications for the selected days
        // IMPORTANT: Use isNewHabit=true to prevent immediate notifications
        await scheduleHabitReminder(newHabit, newHabit.reminderTime, true);
        console.log(`🛠️ Scheduled reminder for preset habit: ${newHabit.title}`);
      } catch (error) {
        console.error('Error scheduling notifications for preset habit:', error);
      }
    }

    // Add the new habit to the habits list
    const updatedHabits = [...habits, newHabit];
    setHabits(updatedHabits);
    setFilteredHabits(applyFilters(updatedHabits, activeFilter, searchQuery));
    saveHabits(updatedHabits);
    
    // Award XP for creating a habit
    try {
      const result = await addXP(XP_REWARDS.CREATE_HABIT);
      if (result.leveledUp) {
        setLevelUpDetails({ level: result.newProgress.level });
        setShowLevelUp(true);
      }
      
      // Show XP gain notification
      const newXpReward = {
        id: `xp-${Date.now()}`,
        amount: XP_REWARDS.CREATE_HABIT,
        message: 'New habit created!'
      };
      setXpRewards(prev => [...prev, newXpReward]);
      
      // Remove XP notification after a delay
      setTimeout(() => {
        setXpRewards(prev => prev.filter(reward => reward.id !== newXpReward.id));
      }, 3000);
    } catch (error) {
      console.error('Error awarding XP for creating habit:', error);
    }
  };

  // Open edit mode for a habit
  const editHabit = (habit: Habit) => {
    setCurrentHabit(habit);
    setIsEditMode(true);
    setIsModalVisible(true);
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadHabits();
  };

  // Search and filter functions
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilteredHabits(applyFilters(habits, activeFilter, query));
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setFilteredHabits(applyFilters(habits, filter, searchQuery));
  };

  // Apply both category filter and search query
  const applyFilters = (habitList: Habit[], filter: string, query: string) => {
    return habitList
      .filter(habit => filter === 'All' || habit.category === filter)
      .filter(habit => habit.title.toLowerCase().includes(query.toLowerCase()));
  };

  // Toggle day selection for habit frequency
  const toggleDaySelection = (day: string) => {
    const updatedFrequency = [...currentHabit.frequency];
    
    if (updatedFrequency.includes(day)) {
      // Remove day if it's already selected
      const index = updatedFrequency.indexOf(day);
      updatedFrequency.splice(index, 1);
    } else {
      // Add day if it's not selected
      updatedFrequency.push(day);
    }
    
    setCurrentHabit({...currentHabit, frequency: updatedFrequency});
  };

  // Update the habit category and related icon/color
  const updateCategory = (category: string) => {
    const selectedCategory = CATEGORIES.find(cat => cat.name === category);
    if (selectedCategory) {
      setCurrentHabit({
        ...currentHabit,
        category: category,
        icon: selectedCategory.icon as IconName,
        color: selectedCategory.color
      });
    }
  };

  // Render a category selection button
  const renderCategoryButton = (category: { name: string, icon: string, color: string }) => {
    const isSelected = currentHabit.category === category.name;
    
    return (
      <TouchableOpacity 
        key={category.name}
        style={[
          styles.categoryButton,
          isSelected && { backgroundColor: category.color, borderColor: category.color }
        ]}
        onPress={() => updateCategory(category.name)}
      >
        <MaterialCommunityIcons 
          name={category.icon} 
          size={20} 
          color={isSelected ? 'white' : category.color} 
        />
        <Text style={[
          styles.categoryButtonText,
          isSelected && { color: 'white' }
        ]}>
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.primary }]}>Loading your habits...</Text>
      </View>
    );
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }
    ]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      
      <KeyboardAvoidingView 
        style={[styles.keyboardContainer, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Minimal Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Manage Habits</Text>
          <TouchableOpacity 
            style={[styles.gamificationButton]} 
            onPress={() => {
              // Add button press animation effect
              Animated.sequence([
                Animated.timing(scaleAnim, {
                  toValue: 0.9,
                  duration: 100,
                  useNativeDriver: true
                }),
                Animated.timing(scaleAnim, {
                  toValue: 1,
                  duration: 100,
                  useNativeDriver: true
                })
              ]).start();
              
              setIsGamificationPanelVisible(true);
            }}
          >
            <Animated.View 
              style={[
                styles.gamificationButtonContent,
                { 
                  backgroundColor: isDark ? theme.colors.cardBackground : theme.colors.lightBackground,
                  borderColor: theme.colors.primary,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              <View style={[styles.levelBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.levelBadgeText}>{userLevel}</Text>
              </View>
              <MaterialCommunityIcons name="trophy" size={20} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, marginLeft: 4, fontWeight: '600', fontSize: 14 }}>Rewards</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={[styles.searchContainer, { 
          backgroundColor: isDark ? theme.colors.card : 'white',
          borderColor: theme.colors.border
        }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.muted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search habits..."
            placeholderTextColor={theme.colors.muted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category filter buttons - Simple horizontal layout */}
        <View style={styles.filterOuterContainer}>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Filter by category:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContainer}
          >
            {/* All categories filter button */}
            <TouchableOpacity 
              style={[
                styles.filterChip,
                { borderColor: theme.colors.primary },
                activeFilter === 'All' && { 
                  backgroundColor: theme.colors.primary,
                }
              ]}
              onPress={() => handleFilterChange('All')}
            >
              <MaterialCommunityIcons 
                name={'filter-outline' as IconName} 
                size={16} 
                color={activeFilter === 'All' ? 'white' : theme.colors.primary} 
              />
              <Text style={[
                styles.filterChipText,
                { color: activeFilter === 'All' ? 'white' : theme.colors.primary }
              ]}>
                All
              </Text>
            </TouchableOpacity>

            {/* Category filter buttons */}
            {CATEGORIES.map(category => {
              const isSelected = activeFilter === category.name;
              return (
                <TouchableOpacity 
                  key={category.name}
                  style={[
                    styles.filterChip,
                    { borderColor: category.color },
                    isSelected && { backgroundColor: category.color }
                  ]}
                  onPress={() => handleFilterChange(category.name)}
                >
                  <MaterialCommunityIcons 
                    name={category.icon} 
                    size={16} 
                    color={isSelected ? 'white' : category.color} 
                  />
                  <Text style={[
                    styles.filterChipText,
                    { color: isSelected ? 'white' : category.color }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Habit list */}
        {filteredHabits.length > 0 ? (
          <FlatList
            data={filteredHabits}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[styles.habitCard, { backgroundColor: isDark ? theme.colors.card : 'white' }]}>
                <View style={styles.habitCardHeader}>
                  <View style={styles.habitTitleRow}>
                    <View style={[styles.habitIconBadge, { backgroundColor: item.color }]}>
                      <MaterialCommunityIcons name={item.icon} size={16} color="white" />
                    </View>
                    <Text style={[styles.habitTitle, { color: theme.colors.text }]}>{item.title}</Text>
                  </View>
                  <Text style={[styles.habitCategory, { 
                    backgroundColor: 'transparent',
                    color: item.color
                  }]}>
                    {item.category}
                  </Text>
                </View>
                
                {item.description ? (
                  <Text style={[styles.habitDescription, { color: theme.colors.muted }]}>
                    {item.description}
                  </Text>
                ) : null}
                
                <View style={styles.habitFrequency}>
                  {DAYS.map((day) => (
                    <View 
                      key={day}
                      style={[
                        styles.dayBadge,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' },
                        item.frequency.includes(day) && { backgroundColor: item.color }
                      ]}
                    >
                      <Text style={[
                        styles.dayText,
                        { color: isDark ? theme.colors.muted : '#666' },
                        item.frequency.includes(day) && { color: 'white' }
                      ]}>
                        {day[0]}
                      </Text>
                    </View>
                  ))}
                </View>

                {item.currentStreak > 0 && (
                  <View style={styles.habitStreak}>
                    <MaterialCommunityIcons name="fire" size={14} color="#FF6B6B" />
                    <Text style={[styles.habitStreakText, { color: theme.colors.muted }]}>
                      <Text style={{fontWeight: 'bold', color: '#FF6B6B'}}>{item.currentStreak}</Text> day streak
                      {item.currentStreak >= 3 && " 🔥"}
                      {item.currentStreak >= 7 && "🔥"}
                      {item.currentStreak >= 30 && "🔥"}
                    </Text>
                  </View>
                )}

                <View style={[styles.habitActions, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
                  <TouchableOpacity 
                    style={styles.habitActionButton}
                    onPress={() => editHabit(item)}
                  >
                    <MaterialCommunityIcons name="pencil" size={16} color={theme.colors.primary} />
                    <Text style={[styles.habitActionText, { color: theme.colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                  
                  <View style={[styles.actionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]} />
                  
                  <TouchableOpacity
                    style={styles.habitActionButton}
                    onPress={() => deleteHabit(item.id)}
                  >
                    <MaterialCommunityIcons name="delete" size={16} color="#ff5252" />
                    <Text style={[styles.habitActionText, { color: "#ff5252" }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.habitList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
            }
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={theme.colors.muted} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No habits found</Text>
            <Text style={[styles.emptyStateMessage, { color: theme.colors.muted }]}>
              {searchQuery || activeFilter !== 'All' 
                ? "Try adjusting your search or filters" 
                : "Create your first habit to start tracking"}
            </Text>
            {!searchQuery && activeFilter === 'All' && (
              <TouchableOpacity 
                style={[styles.emptyStateButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setIsModalVisible(true)}
              >
                <Text style={styles.emptyStateButtonText}>Create Habit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Add/Edit Habit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsModalVisible(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? theme.colors.card : 'white' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {isEditMode ? "Edit Habit" : "Create New Habit"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsModalVisible(false);
                  resetForm();
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Habit Title */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Habit Name *</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                    color: theme.colors.text,
                    borderColor: theme.colors.border 
                  }
                ]}
                value={currentHabit.title}
                onChangeText={(text) => setCurrentHabit({...currentHabit, title: text})}
                placeholder="e.g., Read for 20 minutes"
                placeholderTextColor={theme.colors.muted}
              />

              {/* Habit Description */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Description (optional)</Text>
              <TextInput
                style={[
                  styles.input, 
                  styles.textArea, 
                  { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                    color: theme.colors.text,
                    borderColor: theme.colors.border 
                  }
                ]}
                value={currentHabit.description}
                onChangeText={(text) => setCurrentHabit({...currentHabit, description: text})}
                placeholder="Add details about your habit"
                placeholderTextColor={theme.colors.muted}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Category Selection */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Category</Text>
              <View style={styles.categoriesGridContainer}>
                {CATEGORIES.map(category => {
                  const isSelected = currentHabit.category === category.name;
                  return (
                    <TouchableOpacity 
                      key={category.name}
                      style={[
                        styles.categoryCard,
                        { borderColor: category.color },
                        isSelected && { 
                          backgroundColor: category.color + '15', 
                          borderColor: category.color,
                          borderWidth: 2
                        }
                      ]}
                      onPress={() => updateCategory(category.name)}
                    >
                      <View style={[
                        styles.categoryIconContainer, 
                        { backgroundColor: isSelected ? category.color : category.color + '20' }
                      ]}>
                        <MaterialCommunityIcons 
                          name={category.icon as IconName} 
                          size={24} 
                          color={isSelected ? 'white' : category.color} 
                        />
                      </View>
                      <Text style={[
                        styles.categoryCardText,
                        { color: theme.colors.text },
                        isSelected && { fontWeight: '600', color: category.color }
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Frequency Selection */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Repeat on these days</Text>
              <View style={styles.daysContainer}>
                {DAYS.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      { borderColor: theme.colors.border },
                      currentHabit.frequency.includes(day) && { 
                        backgroundColor: currentHabit.color,
                        borderColor: currentHabit.color
                      }
                    ]}
                    onPress={() => toggleDaySelection(day)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      { color: theme.colors.text },
                      currentHabit.frequency.includes(day) && { color: 'white' }
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reminder Settings */}
              <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>
                Reminder Settings
              </Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <MaterialCommunityIcons 
                    name="bell-outline" 
                    size={22}
                    color={theme.colors.primary} 
                    style={styles.settingIcon} 
                  />
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                    Enable Reminder
                  </Text>
                </View>
                
                <Switch
                  value={currentHabit.reminderEnabled}
                  onValueChange={(value) => {
                    setCurrentHabit({...currentHabit, reminderEnabled: value});
                  }}
                  trackColor={{ false: "#e0e0e0", true: "#b39ddb" }}
                  thumbColor={currentHabit.reminderEnabled ? theme.colors.primary : "#f4f3f4"}
                  ios_backgroundColor="#e0e0e0"
                />
              </View>

              {currentHabit.reminderEnabled && (
                <TouchableOpacity 
                  style={styles.timePickerButton}
                  onPress={() => setShowReminderTimeModal(true)}
                >
                  <View style={styles.settingInfo}>
                    <MaterialCommunityIcons 
                      name="clock-outline" 
                      size={22} 
                      color={theme.colors.primary} 
                      style={styles.settingIcon} 
                    />
                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                      Reminder Time
                    </Text>
                  </View>
                  <View style={styles.settingValue}>
                    <Text style={[styles.settingValueText, { color: theme.colors.primary }]}>
                      {currentHabit.reminderTime || '20:00'}
                    </Text>
                    <MaterialCommunityIcons 
                      name="chevron-right" 
                      size={18} 
                      color={theme.colors.primary} 
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Form Actions */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[
                    styles.formButton, 
                    { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0',
                    }
                  ]}
                  onPress={() => {
                    setIsModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.formButton, { backgroundColor: theme.colors.primary }]}
                  onPress={isEditMode ? updateHabit : addHabit}
                >
                  <Text style={styles.saveButtonText}>
                    {isEditMode ? "Update" : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showReminderTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReminderTimeModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer} 
          activeOpacity={1} 
          onPress={() => setShowReminderTimeModal(false)}
        >
          <View style={[styles.timePickerModalContent, { backgroundColor: isDark ? theme.colors.card : 'white' }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Set Reminder Time
            </Text>
            
            <ScrollView style={styles.timePickerScrollView}>
              {Array.from({ length: 24 }).map((_, hour) => 
                [0, 15, 30, 45].map((minute) => {
                  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                  const isSelected = currentHabit.reminderTime === timeString;
                  
                  return (
                    <TouchableOpacity
                      key={timeString}
                      style={[
                        styles.timeOption,
                        isSelected && { 
                          backgroundColor: currentHabit.color + '20',
                          borderLeftWidth: 4,
                          borderLeftColor: currentHabit.color
                        }
                      ]}
                      onPress={() => {
                        setCurrentHabit({...currentHabit, reminderTime: timeString});
                        setShowReminderTimeModal(false);
                      }}
                    >
                      <Text style={[
                        styles.timeOptionText,
                        { color: theme.colors.text },
                        isSelected && { fontWeight: 'bold', color: currentHabit.color }
                      ]}>
                        {hour === 0 
                          ? `12:${minute.toString().padStart(2, '0')} AM`
                          : hour < 12 
                            ? `${hour}:${minute.toString().padStart(2, '0')} AM`
                            : hour === 12
                              ? `12:${minute.toString().padStart(2, '0')} PM`
                              : `${hour - 12}:${minute.toString().padStart(2, '0')} PM`}
                      </Text>
                      {isSelected && (
                        <MaterialCommunityIcons 
                          name="check" 
                          size={20} 
                          color={currentHabit.color} 
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.timePickerButton, { backgroundColor: currentHabit.color }]}
              onPress={() => setShowReminderTimeModal(false)}
            >
              <Text style={styles.timePickerButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gamification Panel */}
      <GamificationPanel 
        visible={isGamificationPanelVisible}
        onClose={() => setIsGamificationPanelVisible(false)}
        onRefresh={loadHabits}
      />

      {/* Level Up Notification */}
      <LevelUpNotification
        level={levelUpDetails.level}
        visible={showLevelUp}
        onComplete={() => setShowLevelUp(false)}
      />

      {/* XP Reward Animations */}
      {xpRewards.map(reward => (
        <XpReward
          key={reward.id}
          xpAmount={reward.amount}
          message={reward.message}
          onComplete={() => {
            setXpRewards(prev => prev.filter(r => r.id !== reward.id));
          }}
        />
      ))}

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtonsContainer}>
        {/* Preset Habits Button */}
        <TouchableOpacity
          style={[
            styles.floatingButton,
            styles.presetHabitsButton,
            { 
              backgroundColor: theme.colors.accent || '#FF9F40',
              bottom: Platform.OS === 'ios' ? insets.bottom + 20 : 20,
              right: 90 // Position to the left of the main button
            }
          ]}
          activeOpacity={0.8}
          onPress={() => setShowPresetHabitsModal(true)}
        >
          <MaterialCommunityIcons name="format-list-checks" size={24} color="white" />
        </TouchableOpacity>

        {/* Main Add Button */}
        <TouchableOpacity
          style={[
            styles.floatingButton,
            { 
              backgroundColor: theme.colors.primary,
              bottom: Platform.OS === 'ios' ? insets.bottom + 20 : 20
            }
          ]}
          activeOpacity={0.8}
          onPress={() => {
            resetForm();
            setIsModalVisible(true);
          }}
        >
          <MaterialCommunityIcons name="plus" size={26} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Preset Habits Modal */}
      <PresetHabitsModal
        visible={showPresetHabitsModal}
        onClose={() => setShowPresetHabitsModal(false)}
        onSelectPreset={handleSelectPreset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  floatingButtonsContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  presetHabitsButton: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
    padding: 16,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  gamificationButton: {
    padding: 4,
  },
  gamificationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  levelBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  levelBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    zIndex: 999,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
  },
  filterContainer: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  filterOuterContainer: {
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  filterScrollContainer: {
    paddingVertical: 4,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  activeFilterButton: {
    borderColor: 'transparent',
  },
  filterIcon: {
    marginRight: 4,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  habitList: {
    paddingBottom: 16,
  },
  habitCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  habitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
  },
  habitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  habitIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  habitCategory: {
    fontSize: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
    marginLeft: 8,
    fontWeight: '600',
  },
  habitDescription: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  habitFrequency: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  dayBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  habitStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  habitStreakText: {
    fontSize: 13,
    marginLeft: 4,
  },
  habitActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  habitActionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  habitActionText: {
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 13,
  },
  actionDivider: {
    width: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoriesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonText: {
    fontSize: 13,
    marginLeft: 4,
  },
  categoryCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryCardText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dayButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 0,
    width: 40,
    alignItems: 'center',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  formActions: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 32,
    gap: 12,
  },
  formButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontWeight: '500',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 8,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  timePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  timePickerModalContent: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
    width: '85%',
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  timePickerScrollView: {
    marginVertical: 16,
    maxHeight: 300,
  },
  timeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  timeOptionText: {
    fontSize: 16,
  },
  timePickerButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});