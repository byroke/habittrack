import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  Alert, 
  Animated, 
  Easing, 
  Dimensions, 
  Platform, 
  StatusBar, 
  ActivityIndicator, 
  RefreshControl,
  ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isSameDay, parseISO, differenceInDays } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { getHabits, markHabitCompleted, Habit } from '../../../utils/localStorage';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');
const FILTER_OPTIONS = ['All', 'Completed', 'Incomplete'];

export default function DailyTrackerPage() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [filteredHabits, setFilteredHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [progress, setProgress] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [completedAll, setCompletedAll] = useState<boolean>(false);
  
  // Animation refs
  const completionAnimation = useRef(new Animated.Value(0)).current;
  const searchBarAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  // Using any type to avoid TypeScript errors with the animation ref
  const confettiAnimation = useRef<{ play?: () => void }>(null);
  
  // Animated values
  const headerHeight = useRef(new Animated.Value(120)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Fetch habits from AsyncStorage
  const loadHabits = async () => {
    setLoading(true);
    try {
      const habitsData = await getHabits();
      
      if (habitsData && habitsData.length > 0) {
        // Calculate today's completion status for each habit
        const today = format(new Date(), 'yyyy-MM-dd');
        
        const habitsWithTodayStatus = habitsData.map(habit => {
          // Safely check if habit has completedDates and if today is in the array
          const isCompletedToday = habit.completedDates && 
            habit.completedDates.some(date => {
              try {
                return isSameDay(parseISO(date), new Date());
              } catch(e) {
                // Handle invalid date formats
                return date === today;
              }
            });
          
          return {
            ...habit,
            completed: isCompletedToday
          };
        });
        
        setHabits(habitsWithTodayStatus);
        applyFilters(habitsWithTodayStatus, activeFilter, searchQuery);
        
        // Calculate progress percentage
        const completedCount = habitsWithTodayStatus.filter(h => h.completed).length;
        const totalCount = habitsWithTodayStatus.length;
        const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
        
        // Animate progress change
        Animated.timing(progressAnimation, {
          toValue: progressPercentage,
          duration: 800,
          useNativeDriver: false
        }).start();
        
        setProgress(progressPercentage);
        
        // Check if all habits are completed
        if (completedCount === totalCount && totalCount > 0) {
          setCompletedAll(true);
        } else {
          setCompletedAll(false);
        }
      } else {
        setHabits([]);
        setFilteredHabits([]);
        setProgress(0);
        setCompletedAll(false); // Explicitly set to false when no habits exist
        Animated.timing(progressAnimation, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false
        }).start();
      }
      
      // Entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true
        })
      ]).start();
      
    } catch (error) {
      console.error('Error loading habits:', error);
      Alert.alert('Error', 'Could not load your habits.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Apply filters to habits
  const applyFilters = (habitsList: Habit[], filter: string, query: string) => {
    if (!habitsList || habitsList.length === 0) {
      setFilteredHabits([]);
      return [];
    }
    
    let filtered = [...habitsList];
    
    // Apply status filter
    if (filter === 'Completed') {
      filtered = filtered.filter(habit => habit.completed);
    } else if (filter === 'Incomplete') {
      filtered = filtered.filter(habit => !habit.completed);
    }
    
    // Apply search query if present
    if (query && query.trim() !== '') {
      const lowercaseQuery = query.toLowerCase();
      filtered = filtered.filter(habit => 
        habit.title.toLowerCase().includes(lowercaseQuery) ||
        (habit.description && habit.description.toLowerCase().includes(lowercaseQuery))
      );
    }
    
    setFilteredHabits(filtered);
    return filtered;
  };

  // Toggle habit completion status
  const toggleCompletion = async (id: string) => {
    try {
      // Find the current habit
      const habit = habits.find(h => h.id === id);
      if (!habit) return;
      
      // Calculate new status
      const isCompleted = !habit.completed;
      
      // Provide haptic feedback
      Haptics.impactAsync(isCompleted ? 
        Haptics.ImpactFeedbackStyle.Medium : 
        Haptics.ImpactFeedbackStyle.Light
      );
      
      // Optimistically update UI immediately for better UX
      const updatedHabits = habits.map(h => {
        if (h.id === id) {
          return {
            ...h,
            completed: isCompleted,
            currentStreak: isCompleted ? (h.currentStreak || 0) + 1 : 0,
            longestStreak: isCompleted ? 
              Math.max(h.longestStreak || 0, (h.currentStreak || 0) + 1) : 
              h.longestStreak
          };
        }
        return h;
      });
      
      setHabits(updatedHabits);
      applyFilters(updatedHabits, activeFilter, searchQuery);
      
      // Update progress
      const completedCount = updatedHabits.filter(h => h.completed).length;
      const totalCount = updatedHabits.length;
      const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
      
      // Animate progress change
      Animated.timing(progressAnimation, {
        toValue: progressPercentage,
        duration: 800,
        useNativeDriver: false
      }).start();
      
      setProgress(progressPercentage);
      
      // Show animation if completing
      if (isCompleted) {
        animateCompletion();
        
        // Check if all habits are now completed
        if (completedCount === totalCount && totalCount > 0) {
          setCompletedAll(true);
          setTimeout(() => {
            try {
              // Show success notification and alert without using animation
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              
              setTimeout(() => {
                Alert.alert(
                  "Congratulations! 🎉", 
                  "You've completed all your habits for today!",
                  [{ text: "Awesome!" }]
                );
              }, 500);
            } catch (error) {
              console.log("Animation error:", error);
              // Still show congratulations even if animation fails
              Alert.alert(
                "Congratulations! 🎉", 
                "You've completed all your habits for today!",
                [{ text: "Awesome!" }]
              );
            }
          }, 300);
        }
      } else {
        // If unchecking a task when all were completed
        if (completedAll) {
          setCompletedAll(false);
        }
      }
      
      // Persist the change to storage (after UI update for responsiveness)
      const success = await markHabitCompleted(id, isCompleted);
      
      if (!success) {
        // If save fails, revert the UI change
        const revertedHabits = habits;
        setHabits([...revertedHabits]);
        applyFilters(revertedHabits, activeFilter, searchQuery);
        Alert.alert('Error', 'Could not update habit status.');
      }
      
    } catch (error) {
      console.error('Error updating habit:', error);
      Alert.alert('Error', 'Could not update habit status.');
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    applyFilters(habits, filter, searchQuery);
  };
  
  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(habits, activeFilter, query);
  };
  
  // Toggle search bar
  const toggleSearch = () => {
    if (showSearch) {
      // Hide search bar
      Animated.timing(searchBarAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false
      }).start(() => {
        setShowSearch(false);
        setSearchQuery('');
        applyFilters(habits, activeFilter, '');
      });
    } else {
      // Show search bar
      setShowSearch(true);
      Animated.timing(searchBarAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false
      }).start();
    }
  };

  // Run completion animation
  const animateCompletion = () => {
    completionAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(completionAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true
      }),
      Animated.timing(completionAnimation, {
        toValue: 0,
        duration: 400,
        delay: 800,
        useNativeDriver: true
      })
    ]).start();
  };

  // Refresh data
  const onRefresh = () => {
    setRefreshing(true);
    loadHabits();
  };

  // Go to statistics page
  const goToStatistics = () => {
    navigation.navigate('Statistics' as never);
  };

  // Load habits when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      
      loadHabits();
    }, [])
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={[
        styles.loadingContainer, 
        { backgroundColor: theme.colors.background }
      ]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.primary }]}>
          Loading your habits...
        </Text>
      </View>
    );
  }

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
      
      {/* Animated Header */}
      <Animated.View style={[
        styles.header, 
        { 
          backgroundColor: theme.colors.background,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Daily Tracker
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {format(new Date(), 'EEEE, MMMM do')}
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <Animated.View style={{
              width: searchBarAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, width - 120]
              }),
              opacity: searchBarAnimation,
              marginRight: 8
            }}>
              {showSearch && (
                <TextInput
                  style={[
                    styles.searchInput,
                    { 
                      backgroundColor: isDark ? theme.colors.card : 'white',
                      borderColor: theme.colors.border,
                      color: theme.colors.text
                    }
                  ]}
                  placeholder="Search habits..."
                  placeholderTextColor={theme.colors.muted}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoFocus
                />
              )}
            </Animated.View>
            
            <TouchableOpacity 
              style={[
                styles.headerButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.lightBackground }
              ]}
              onPress={toggleSearch}
            >
              <MaterialCommunityIcons 
                name={showSearch ? "close" : "magnify"} 
                size={22} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTextContainer}>
            <Text style={[styles.progressText, { color: theme.colors.text }]}>
              {`${Math.round(progress)}% Complete`}
            </Text>
            <Text style={[styles.progressCount, { color: theme.colors.muted }]}>
              {`${habits.filter(h => h.completed).length}/${habits.length}`}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: theme.colors.primary,
                  width: progressAnimation.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  }) 
                }
              ]} 
            />
          </View>
        </View>
      </Animated.View>
      
      {/* Filters */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity 
              key={option}
              style={[
                styles.filterButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' },
                activeFilter === option && 
                  [styles.activeFilterButton, { backgroundColor: theme.colors.primary }]
              ]}
              onPress={() => handleFilterChange(option)}
            >
              <Text style={[
                styles.filterButtonText,
                { color: theme.colors.primary },
                activeFilter === option && 
                  [styles.activeFilterButtonText, { color: 'white' }]
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
      
      {/* Habit List */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {filteredHabits.length > 0 ? (
          <FlatList
            data={filteredHabits}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => {
              // Create animation values outside of the render function
              const translateY = fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30 * (index + 1), 0],
              });
              
              return (
                <Animated.View
                  style={{
                    opacity: fadeAnim,
                    transform: [{ translateY }]
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.habitItem, 
                      { 
                        backgroundColor: item.completed ? 
                          isDark ? 'rgba(76, 175, 80, 0.2)' : '#F1F8E9' : 
                          isDark ? theme.colors.card : 'white',
                      }
                    ]}
                    onPress={() => toggleCompletion(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.habitIndicator, { backgroundColor: item.color || theme.colors.primary }]} />
                    <View style={styles.habitContent}>
                      <View style={[
                        styles.habitIconContainer,
                        { backgroundColor: item.color || theme.colors.primary }
                      ]}>
                        <MaterialCommunityIcons 
                          name={item.completed ? "check" : item.icon || "circle-outline"} 
                          size={16} 
                          color="white" 
                        />
                      </View>
                      <View style={styles.habitTextContainer}>
                        <Text style={[
                          styles.habitTitle,
                          { color: theme.colors.text },
                          item.completed && { 
                            color: isDark ? '#aaa' : '#6c757d',
                            textDecorationLine: 'line-through'
                          }
                        ]}>
                          {item.title}
                        </Text>
                        {item.description ? (
                          <Text style={[
                            styles.habitDescription, 
                            { color: theme.colors.muted },
                            item.completed && { color: isDark ? '#777' : '#aaa' }
                          ]}>
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.checkContainer}>
                      <MaterialCommunityIcons 
                        name={item.completed ? "check-circle" : "circle-outline"} 
                        size={24} 
                        color={item.completed ? theme.colors.success : theme.colors.muted} 
                      />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            }}
            contentContainerStyle={[
              styles.habitList,
              { paddingBottom: 80 + insets.bottom }
            ]}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={[theme.colors.primary]} 
                tintColor={theme.colors.primary}
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name={
                activeFilter === 'Completed' ? "check-all" :
                activeFilter === 'Incomplete' ? "check-circle" : "calendar-blank"
              } 
              size={60} 
              color={theme.colors.muted} 
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {activeFilter === 'Completed' ? 'No completed habits yet' : 
               activeFilter === 'Incomplete' ? 'All habits completed!' : 
               searchQuery ? 'No matching habits found' : 'No habits for today'}
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.muted }]}>
              {activeFilter === 'Completed' ? 'Complete some habits to see them here' : 
               activeFilter === 'Incomplete' ? 'Great job! You\'ve completed all your habits' : 
               searchQuery ? 'Try a different search term' : 'Add habits in the Manage Habits tab'}
            </Text>

            {!searchQuery && activeFilter === 'All' && habits.length === 0 && (
              <TouchableOpacity 
                style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('Manage Habits' as never)}
              >
                <MaterialCommunityIcons name="plus" size={18} color="white" />
                <Text style={styles.emptyButtonText}>Add New Habit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
      
      {/* Floating Stats Button */}
      <TouchableOpacity 
        style={[
          styles.floatingButton,
          { backgroundColor: theme.colors.primary }
        ]} 
        onPress={goToStatistics}
      >
        <MaterialCommunityIcons name="chart-bar" size={22} color="white" />
      </TouchableOpacity>
      
      {/* Completion Popup */}
      <Animated.View 
        style={[
          styles.completionPopup,
          {
            backgroundColor: isDark ? theme.colors.card : 'white',
            opacity: completionAnimation,
            transform: [
              { scale: completionAnimation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.8, 1.1, 1]
              })},
              { translateY: completionAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}
            ]
          }
        ]}
      >
        <View style={styles.completionContent}>
          <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.success} />
          <Text style={[styles.completionText, { color: theme.colors.text }]}>
            Habit completed!
          </Text>
        </View>
      </Animated.View>
      
      {/* Remove the confetti animation for now to prevent crashes */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressCount: {
    fontSize: 14,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 3,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 10,
  },
  activeFilterButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    fontWeight: '600',
  },
  habitList: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  habitIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  habitContent: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  habitIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  habitDescription: {
    fontSize: 13,
  },
  checkContainer: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  completionPopup: {
    position: 'absolute',
    bottom: 80,
    left: 50,
    right: 50,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  completionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  confetti: {
    width: '100%',
    height: '100%',
  }
});