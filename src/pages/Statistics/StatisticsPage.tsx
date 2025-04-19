// filepath: /home/pirat/my-expo-app/src/pages/Statistics/StatisticsPage.tsx
import React, { useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Habit, getHabits } from '../../../utils/localStorage';
import { format, subDays } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;

type StatsSummary = {
  total: number;
  completed: number;
  streak: number;
  completionRate: number;
};

export default function StatisticsPage() {
  const { theme, isDark } = useTheme();
  const [summary, setSummary] = useState<StatsSummary>({
    total: 0,
    completed: 0,
    streak: 0,
    completionRate: 0
  });
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [topHabit, setTopHabit] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Fetch habit data from AsyncStorage
  const fetchHabitData = async () => {
    setLoading(true);
    try {
      const habits = await getHabits();
      
      if (habits && habits.length > 0) {
        // Today's date
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Count completed habits today
        const completedToday = habits.filter((habit: Habit) => 
          habit.completedDates && 
          habit.completedDates.includes(today)
        ).length;
        
        // Calculate completion rate
        const totalHabits = habits.length;
        const completionRate = totalHabits > 0 
          ? Math.round((completedToday / totalHabits) * 100)
          : 0;
        
        // Find max streak
        let maxStreak = 0;
        let habitWithMaxStreak = '';
        
        habits.forEach((habit: Habit) => {
          if (habit.currentStreak > maxStreak) {
            maxStreak = habit.currentStreak;
            habitWithMaxStreak = habit.title;
          }
        });
        
        // Weekly data (last 7 days)
        const weeklyCompletions = Array(7).fill(0).map((_, index) => {
          const date = format(subDays(new Date(), 6 - index), 'yyyy-MM-dd');
          return habits.filter((habit: Habit) => 
            habit.completedDates && 
            habit.completedDates.includes(date)
          ).length;
        });
        
        // Update state
        setSummary({
          total: totalHabits,
          completed: completedToday,
          streak: maxStreak,
          completionRate
        });
        
        setWeeklyData(weeklyCompletions);
        setTopHabit(habitWithMaxStreak);
        
        // Animate progress
        Animated.timing(progressAnim, {
          toValue: completionRate / 100,
          duration: 800,
          useNativeDriver: false
        }).start();
      } else {
        // Reset to defaults if no habits
        setSummary({
          total: 0,
          completed: 0,
          streak: 0,
          completionRate: 0
        });
        setWeeklyData([0, 0, 0, 0, 0, 0, 0]);
        setTopHabit('');
        progressAnim.setValue(0);
      }
      
      // Start entrance animations
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
      console.error("Error fetching habit data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      fetchHabitData();
    }, [])
  );

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHabitData();
  }, []);

  // Data for weekly chart
  const weeklyChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: weeklyData,
        color: (opacity = 1) => theme.colors.primary,
        strokeWidth: 2
      }
    ],
  };

  // Chart configuration
  const chartConfig = {
    backgroundColor: theme.colors.card,
    backgroundGradientFrom: theme.colors.card,
    backgroundGradientTo: theme.colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => theme.colors.primary,
    labelColor: (opacity = 1) => theme.colors.text,
    style: {
      borderRadius: 16,
    },
    barPercentage: 0.7,
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.primary }]}>
          Loading your statistics...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>Statistics</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {format(new Date(), 'MMMM d, yyyy')}
          </Text>
        </Animated.View>

        {/* Today's Progress Card */}
        <Animated.View 
          style={[
            styles.card,
            { 
              backgroundColor: theme.colors.card,
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}]
            }
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Today's Progress
          </Text>
          
          {/* Progress Circle */}
          <View style={styles.progressCircleContainer}>
            <View style={styles.progressStats}>
              <Text style={[styles.progressPercentage, { color: theme.colors.primary }]}>
                {summary.completionRate}%
              </Text>
              <Text style={[styles.progressLabel, { color: theme.colors.muted }]}>
                Completed
              </Text>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
            <Animated.View 
              style={[
                styles.progressFill, 
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
          
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="format-list-bulleted" size={20} color={theme.colors.muted} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{summary.total}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Total Habits</Text>
            </View>
            
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]} />
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.success} />
              <Text style={[styles.statValue, { color: theme.colors.success }]}>{summary.completed}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Completed</Text>
            </View>
            
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]} />
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="trophy" size={20} color={theme.colors.warning} />
              <Text style={[styles.statValue, { color: theme.colors.warning }]}>{summary.streak}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Best Streak</Text>
            </View>
          </View>
          
          {summary.streak > 0 && topHabit && (
            <TouchableOpacity 
              style={[styles.streakBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0' }]}
            >
              <MaterialCommunityIcons name="fire" size={18} color={theme.colors.warning} />
              <Text style={[styles.streakText, { color: theme.colors.text }]}>
                Your best streak is {summary.streak} days with "{topHabit}"
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
        
        {/* Weekly Activity Card */}
        <Animated.View 
          style={[
            styles.card,
            { 
              backgroundColor: theme.colors.card,
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0]
              })}]
            }
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Weekly Activity
          </Text>
          
          {weeklyData.some(value => value > 0) ? (
            <View style={styles.chartContainer}>
              <BarChart
                data={weeklyChartData}
                width={screenWidth - 64}
                height={180}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=""
                fromZero
              />
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons name="chart-bar" size={42} color={theme.colors.muted} />
              <Text style={[styles.emptyStateText, { color: theme.colors.muted }]}>
                Complete some habits to see your weekly activity
              </Text>
            </View>
          )}
        </Animated.View>
        
        {/* Tip Card */}
        <Animated.View 
          style={[
            styles.card,
            styles.tipCard,
            { 
              backgroundColor: theme.colors.lightBackground || theme.colors.card,
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [60, 0]
              })}]
            }
          ]}
        >
          <View style={styles.tipContent}>
            <MaterialCommunityIcons 
              name="lightbulb-on" 
              size={24} 
              color={isDark ? theme.colors.accent : theme.colors.primary} 
            />
            <Text style={[styles.tipText, { color: theme.colors.text }]}>
              Consistency is key! Habits that are tracked daily have a 21% higher completion rate.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressCircleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressStats: {
    alignItems: 'center',
    marginVertical: 8,
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 20,
    marginHorizontal: 4,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    opacity: 0.6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  streakText: {
    fontSize: 14,
    marginLeft: 8,
  },
  chartContainer: {
    alignItems: 'center',
    paddingTop: 10,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 15,
  },
  tipCard: {
    paddingVertical: 16,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});
