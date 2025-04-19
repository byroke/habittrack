import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Easing } from 'react-native';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getHabits, Habit } from '../../../utils/localStorage';
import { format, differenceInDays, isSameDay } from 'date-fns';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;
const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'It\'s not about perfect. It\'s about effort.', author: 'Jillian Michaels' },
  { text: 'Small changes eventually add up to huge results.', author: 'Unknown' },
  { text: 'Habits form the foundation of achievement.', author: 'James Clear' },
  { text: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' }
];

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userName, updateUserName, isLoading: userLoading } = useUser();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [todayStats, setTodayStats] = useState({
    total: 0,
    completed: 0,
    remaining: 0,
    completionRate: 0
  });
  const [upcomingHabits, setUpcomingHabits] = useState<Habit[]>([]);
  const [streakHabits, setStreakHabits] = useState<Habit[]>([]);
  const [motivationalQuote, setMotivationalQuote] = useState(QUOTES[0]);
  const [lastActive, setLastActive] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // Start animations when component mounts
  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,  // Reduced duration for a snappier feel
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        easing: Easing.out(Easing.back(1.2)),  // Less bouncy animation
        useNativeDriver: true,
      })
    ]).start();
    
    // Reset animations when component unmounts
    return () => {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      progressAnim.setValue(0);
    };
  }, []);

  // Update progress animation when stats change
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: todayStats.completionRate / 100,
      duration: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [todayStats.completionRate]);

  // Get time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Save last active date
  const updateLastActive = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await AsyncStorage.setItem('lastActiveDate', today);
      
      // Get previous last active date
      const previousDate = await AsyncStorage.getItem('lastActiveDate');
      setLastActive(previousDate);
      
      // Check if it's a new day since last active
      if (previousDate && !isSameDay(new Date(previousDate), new Date())) {
        // Show streak celebration if they were active yesterday
        const dayDiff = differenceInDays(
          new Date(), 
          new Date(previousDate)
        );
        
        if (dayDiff === 1) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      }
    } catch (error) {
      console.error('Error updating last active date:', error);
    }
  };

  // Select random motivational quote
  const selectRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    setMotivationalQuote(QUOTES[randomIndex]);
  };

  // Fetch today's habit data
  const fetchData = async () => {
    try {
      setLoading(true);
      const habits = await getHabits();
      
      if (habits && habits.length > 0) {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Calculate today's habit stats
        const completed = habits.filter(habit => 
          habit.completedDates && 
          habit.completedDates.includes(today)
        ).length;
        
        const completionRate = habits.length > 0 
          ? Math.round((completed / habits.length) * 100) 
          : 0;
        
        setTodayStats({
          total: habits.length,
          completed,
          remaining: habits.length - completed,
          completionRate
        });
        
        // Get habits not yet completed today
        const notCompletedHabits = habits
          .filter(habit => 
            !habit.completedDates || 
            !habit.completedDates.includes(today)
          )
          .slice(0, 5); // Limit to 5 habits
        
        setUpcomingHabits(notCompletedHabits);
        
        // Find habits with longest streaks
        const habitsWithStreaks = habits
          .filter(habit => habit.currentStreak && habit.currentStreak > 1)
          .sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0))
          .slice(0, 3); // Top 3 habits with streaks
        
        setStreakHabits(habitsWithStreaks);
      } else {
        // Handle case with no habits
        setTodayStats({
          total: 0,
          completed: 0,
          remaining: 0,
          completionRate: 0
        });
        setUpcomingHabits([]);
        setStreakHabits([]);
      }
      
      // Select a new random quote each time
      selectRandomQuote();
      
    } catch (error) {
      console.error('Error fetching habits:', error);
      Alert.alert('Error', 'Could not load your habits. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      updateLastActive();
      fetchData();
    }, [])
  );

  // Handle habit press with proper typing
  const handleHabitPress = (habit: Habit) => {
    // Navigate to Daily Tracker with the selected habit
    navigation.navigate('Daily Tracker', { selectedHabitId: habit.id });
  };
  
  // Handle edit profile button click
  const handleEditProfile = () => {
    if (Platform.OS === 'ios') {
      // Use built-in Alert.prompt for iOS
      Alert.prompt(
        "Set Your Name", 
        "What should we call you?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Save", 
            onPress: (inputText) => {
              if (inputText && inputText.trim() !== '') {
                try {
                  updateUserName(inputText);
                } catch (error) {
                  Alert.alert('Error', 'Could not save your name. Please try again.');
                }
              }
            }
          }
        ],
        'plain-text',
        userName !== 'Friend' ? userName : '',
        'default'
      );
    } else {
      // Show custom modal for Android
      setNewUserName(userName !== 'Friend' ? userName : '');
      setShowNameModal(true);
    }
  };

  // Handle save name from modal
  const handleSaveName = async () => {
    try {
      if (newUserName.trim() !== '') {
        await updateUserName(newUserName);
        setShowNameModal(false);
      } else {
        Alert.alert('Invalid Name', 'Please enter a valid name.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not save your name. Please try again.');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? theme.colors.background : '#fff' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[
      styles.safeArea, 
      { 
        backgroundColor: isDark ? theme.colors.background : '#fff',
        paddingTop: insets.top
      }
    ]}>
      <StatusBar backgroundColor={isDark ? theme.colors.background : '#fff'} barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView 
        style={[styles.container, { backgroundColor: isDark ? theme.colors.background : '#fff' }]}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Minimal Header */}
        <Animated.View style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}>
          <View>
            <Text style={[styles.greeting, { color: isDark ? theme.colors.text : '#333' }]}>
              {`${getGreeting()}, ${userName}`}
            </Text>
            <Text style={[styles.date, { color: isDark ? theme.colors.muted : '#666' }]}>
              {format(new Date(), 'EEEE, MMMM do')}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleEditProfile} 
            style={[styles.profileButton]}
          >
            <MaterialCommunityIcons name="account-edit" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Minimal Progress Section */}
        <Animated.View style={[
          styles.progressContainer, 
          { 
            backgroundColor: isDark ? 'transparent' : 'transparent',
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          {/* Progress Circle - minimal design */}
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: isDark ? theme.colors.text : '#333' }]}>
              Today's Progress
            </Text>
            <View style={styles.progressPercent}>
              <Text style={[styles.progressPercentValue, { color: theme.colors.primary }]}>
                {todayStats.completionRate}%
              </Text>
            </View>
          </View>
          
          {/* Simple progress bar */}
          <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
            <Animated.View 
              style={[
                styles.progressBarFill, 
                { 
                  backgroundColor: theme.colors.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
          
          {/* Minimalist stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isDark ? theme.colors.text : '#333' }]}>
                {todayStats.total}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? theme.colors.muted : '#999' }]}>
                Total
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.success }]}>
                {todayStats.completed}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? theme.colors.muted : '#999' }]}>
                Done
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: todayStats.remaining > 0 ? (isDark ? '#ff7675' : '#ff5252') : (isDark ? theme.colors.muted : '#999') }]}>
                {todayStats.remaining}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? theme.colors.muted : '#999' }]}>
                Pending
              </Text>
            </View>
          </View>
        </Animated.View>
        
        {/* Habits Section - Minimal Design */}
        <Animated.View style={[
          styles.sectionContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ 
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0]
              }) 
            }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? theme.colors.text : '#333' }]}>
              Today's Habits
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Daily Tracker')}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingHabits.length > 0 ? (
            <View style={styles.habitsList}>
              {upcomingHabits.map((habit, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.habitCard} 
                  onPress={() => handleHabitPress(habit)}
                >
                  <View style={[
                    styles.habitIconContainer,
                    { backgroundColor: habit.color || theme.colors.primary }
                  ]}>
                    <MaterialCommunityIcons 
                      name={habit.icon || "checkbox-marked-circle-outline"} 
                      size={20} 
                      color="white" 
                    />
                  </View>
                  <View style={styles.habitInfo}>
                    <Text style={[styles.habitName, { color: isDark ? theme.colors.text : '#333' }]}>
                      {habit.title || habit.name}
                    </Text>
                    {habit.description && (
                      <Text style={[styles.habitDescription, { color: isDark ? theme.colors.muted : '#666' }]} numberOfLines={1}>
                        {habit.description}
                      </Text>
                    )}
                    {habit.reminderEnabled && (
                      <View style={styles.reminderInfo}>
                        <MaterialCommunityIcons name="bell-outline" size={12} color={theme.colors.primary} />
                        <Text style={[styles.reminderTime, { color: theme.colors.primary }]}>
                          Reminder: {habit.reminderTime}
                        </Text>
                      </View>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={isDark ? theme.colors.muted : '#ccc'} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={[styles.emptyStateText, { color: isDark ? theme.colors.muted : '#999' }]}>
                You've completed all habits for today.
              </Text>
              <TouchableOpacity 
                style={styles.addHabitButton}
                onPress={() => navigation.navigate('Manage Habits')}
              >
                <MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />
                <Text style={[styles.addHabitButtonText, { color: theme.colors.primary }]}>Add New Habit</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
        
        {/* Streak Champions - Minimal Design */}
        {streakHabits.length > 0 && (
          <Animated.View style={[
            styles.sectionContainer,
            { 
              opacity: fadeAnim,
              transform: [{ 
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0]
                }) 
              }]
            }
          ]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? theme.colors.text : '#333' }]}>
                Streak Champions
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Statistics')}>
                <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>Stats</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {streakHabits.map((habit, index) => (
                <View key={index} style={styles.streakCard}>
                  <Text style={[styles.streakValue, { color: habit.color || theme.colors.primary }]}>
                    {habit.currentStreak || 0}
                  </Text>
                  <Text style={[styles.streakLabel, { color: isDark ? theme.colors.muted : '#999' }]}>
                    day streak
                  </Text>
                  <Text style={[styles.streakHabitName, { color: isDark ? theme.colors.text : '#333' }]} numberOfLines={2}>
                    {habit.title || habit.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}
        
        {/* Simple Quote Card */}
        <Animated.View style={[
          styles.quoteCard, 
          { 
            opacity: fadeAnim,
            transform: [{ 
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              }) 
            }]
          }
        ]}>
          <Text style={[styles.quote, { color: isDark ? theme.colors.muted : '#666' }]}>
            "{motivationalQuote.text}"
          </Text>
          <Text style={[styles.quoteAuthor, { color: theme.colors.primary }]}>
            {motivationalQuote.author}
          </Text>
        </Animated.View>
        
        {/* Quick Actions - Minimal Design */}
        <Animated.View style={[
          styles.quickActionsContainer,
          {
            opacity: fadeAnim,
            transform: [{ 
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [80, 0]
              }) 
            }]
          }
        ]}>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Manage Habits')}
          >
            <MaterialCommunityIcons name="plus" size={20} color="white" />
            <Text style={styles.quickActionText}>New Habit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f5f5f5' }]}
            onPress={() => navigation.navigate('Statistics')}
          >
            <MaterialCommunityIcons name="chart-bar" size={20} color={theme.colors.primary} />
            <Text style={[styles.quickActionText, {color: theme.colors.primary}]}>Statistics</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
      
      {/* Celebration Overlay */}
      {showCelebration && (
        <View style={styles.celebrationOverlay}>
          <View style={[styles.celebrationCard, { backgroundColor: isDark ? theme.colors.card : 'white' }]}>
            <MaterialCommunityIcons name="party-popper" size={40} color="#FFD700" />
            <Text style={[styles.celebrationTitle, { color: isDark ? theme.colors.text : '#333' }]}>
              Streak Continued!
            </Text>
          </View>
        </View>
      )}

      {/* Custom Name Edit Modal (for Android) */}
      <Modal
        visible={showNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNameModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={[styles.modalContent, { backgroundColor: isDark ? theme.colors.card : 'white' }]}>
                  <Text style={[styles.modalTitle, { color: isDark ? theme.colors.text : '#333' }]}>
                    Enter your name
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput, 
                      { 
                        borderColor: isDark ? theme.colors.border : '#eee',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                        color: isDark ? theme.colors.text : '#333'
                      }
                    ]}
                    value={newUserName}
                    onChangeText={setNewUserName}
                    placeholder="Your name"
                    placeholderTextColor={isDark ? theme.colors.muted : "#999"}
                  />
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity 
                      style={[styles.modalButton, { backgroundColor: theme.colors.primary }]} 
                      onPress={handleSaveName}
                    >
                      <Text style={styles.modalButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f5f5f5' }]} 
                      onPress={() => setShowNameModal(false)}
                    >
                      <Text style={[styles.modalButtonText, { color: isDark ? theme.colors.text : '#333' }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    marginTop: 4,
  },
  profileButton: {
    padding: 8,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressPercent: {
    alignItems: 'flex-end',
  },
  progressPercentValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e0e0e0',
    opacity: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  quoteCard: {
    marginBottom: 24,
  },
  quote: {
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
    lineHeight: 22,
  },
  quoteAuthor: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 14,
  },
  habitsList: {
    marginBottom: 8,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  habitIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '500',
  },
  habitDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reminderTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 15,
  },
  addHabitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addHabitButtonText: {
    marginLeft: 6,
    fontWeight: '500',
  },
  streakCard: {
    marginRight: 16,
    width: 100,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  streakLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  streakHabitName: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  quickActionText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    margin: 20,
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 280,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});