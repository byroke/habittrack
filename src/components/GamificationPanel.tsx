import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  Image,
  FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { 
  getUserProgress,
  getAchievements,
  Achievement,
  UserProgress
} from '../../utils/gamificationUtils';

const GamificationPanel = ({ visible, onClose, onRefresh }) => {
  const { theme, isDark } = useTheme();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeTab, setActiveTab] = useState<'progress' | 'achievements' | 'challenges'>('progress');
  
  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);
  
  const loadData = async () => {
    try {
      const progress = await getUserProgress();
      const userAchievements = await getAchievements();
      
      setUserProgress(progress);
      setAchievements(userAchievements);
      
      // Remove this call to prevent infinite loop
      // if (onRefresh) {
      //   onRefresh();
      // }
    } catch (error) {
      console.error('Error loading gamification data:', error);
    }
  };
  
  if (!visible || !userProgress) return null;
  
  const progressPercentage = (userProgress.currentXP / userProgress.nextLevelXP) * 100;
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[
          styles.panel, 
          { 
            backgroundColor: isDark ? theme.colors.card : 'white',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }
        ]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Your Progress</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'progress' && { 
                  backgroundColor: theme.colors.primary + '20',
                  borderBottomWidth: 2,
                  borderBottomColor: theme.colors.primary
                }
              ]}
              onPress={() => setActiveTab('progress')}
            >
              <MaterialCommunityIcons 
                name="trophy" 
                size={22} 
                color={activeTab === 'progress' ? theme.colors.primary : theme.colors.text} 
              />
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'progress' ? theme.colors.primary : theme.colors.text }
              ]}>
                Level
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'achievements' && { 
                  backgroundColor: theme.colors.primary + '20',
                  borderBottomWidth: 2,
                  borderBottomColor: theme.colors.primary
                }
              ]}
              onPress={() => setActiveTab('achievements')}
            >
              <MaterialCommunityIcons 
                name="medal" 
                size={22} 
                color={activeTab === 'achievements' ? theme.colors.primary : theme.colors.text} 
              />
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'achievements' ? theme.colors.primary : theme.colors.text }
              ]}>
                Achievements
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'challenges' && { 
                  backgroundColor: theme.colors.primary + '20',
                  borderBottomWidth: 2,
                  borderBottomColor: theme.colors.primary
                }
              ]}
              onPress={() => setActiveTab('challenges')}
            >
              <MaterialCommunityIcons 
                name="flag" 
                size={22} 
                color={activeTab === 'challenges' ? theme.colors.primary : theme.colors.text} 
              />
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'challenges' ? theme.colors.primary : theme.colors.text }
              ]}>
                Challenges
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content}>
            {activeTab === 'progress' && (
              <View style={styles.progressContent}>
                <View style={styles.levelSection}>
                  <View style={styles.levelCircle}>
                    <Text style={styles.levelNumber}>{userProgress.level}</Text>
                    <Text style={styles.levelLabel}>Level</Text>
                  </View>
                  
                  <View style={styles.xpInfo}>
                    <Text style={[styles.xpText, { color: theme.colors.text }]}>
                      <Text style={{ fontWeight: 'bold' }}>{userProgress.currentXP}</Text>
                      <Text> / {userProgress.nextLevelXP} XP</Text>
                    </Text>
                    
                    <View style={[styles.progressBarContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#e0e0e0' }]}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { width: `${progressPercentage}%`, backgroundColor: theme.colors.primary }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.xpToGo, { color: theme.colors.muted }]}>
                      {userProgress.nextLevelXP - userProgress.currentXP} XP to next level
                    </Text>
                  </View>
                </View>
                
                <View style={styles.statsSection}>
                  <Text style={[styles.statsSectionTitle, { color: theme.colors.text }]}>
                    Your Stats
                  </Text>
                  
                  <View style={styles.statCards}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f8f8f8' }]}>
                      <MaterialCommunityIcons name="star" size={28} color="#FFD700" />
                      <Text style={[styles.statValue, { color: theme.colors.text }]}>
                        {userProgress.totalXP}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
                        Total XP
                      </Text>
                    </View>
                    
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f8f8f8' }]}>
                      <MaterialCommunityIcons name="medal" size={28} color="#C0C0C0" />
                      <Text style={[styles.statValue, { color: theme.colors.text }]}>
                        {unlockedAchievements.length}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
                        Achievements
                      </Text>
                    </View>
                    
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f8f8f8' }]}>
                      <MaterialCommunityIcons name="calendar-check" size={28} color="#4BC0C0" />
                      <Text style={[styles.statValue, { color: theme.colors.text }]}>
                        {/* This would be calculated based on habit data */}
                        0
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
                        Perfect Days
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.rewardsSection}>
                  <Text style={[styles.rewardsSectionTitle, { color: theme.colors.text }]}>
                    Level Rewards
                  </Text>
                  
                  <View style={[styles.rewardCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f8f8f8' }]}>
                    <View style={styles.rewardHeader}>
                      <MaterialCommunityIcons name="gift" size={24} color={theme.colors.primary} />
                      <Text style={[styles.rewardTitle, { color: theme.colors.text }]}>
                        Level {userProgress.level + 2} Reward
                      </Text>
                    </View>
                    <Text style={[styles.rewardDescription, { color: theme.colors.muted }]}>
                      Unlock custom habit icons
                    </Text>
                    <View style={[styles.rewardProgressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#e0e0e0' }]}>
                      <View 
                        style={[
                          styles.rewardProgress, 
                          { width: `${progressPercentage}%`, backgroundColor: theme.colors.primary }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}
            
            {activeTab === 'achievements' && (
              <View style={styles.achievementsContent}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Your Achievements ({unlockedAchievements.length}/{achievements.length})
                </Text>
                
                <Text style={[styles.achievementSubtitle, { color: theme.colors.text }]}>
                  Unlocked ({unlockedAchievements.length})
                </Text>
                
                {unlockedAchievements.length > 0 ? (
                  <View style={styles.achievementsList}>
                    {unlockedAchievements.map(achievement => (
                      <View 
                        key={achievement.id}
                        style={[styles.achievementCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f8f8f8' }]}
                      >
                        <View style={[styles.achievementIconContainer, { backgroundColor: '#4CAF50' }]}>
                          <MaterialCommunityIcons name={achievement.icon} size={24} color="white" />
                        </View>
                        
                        <View style={styles.achievementInfo}>
                          <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>
                            {achievement.title}
                          </Text>
                          <Text style={[styles.achievementDescription, { color: theme.colors.muted }]}>
                            {achievement.description}
                          </Text>
                          {achievement.unlockedAt && (
                            <Text style={[styles.achievementDate, { color: theme.colors.muted }]}>
                              Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                        
                        <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="trophy-broken" size={48} color={theme.colors.muted} />
                    <Text style={[styles.emptyStateText, { color: theme.colors.muted }]}>
                      No achievements unlocked yet. Keep up your habits to earn achievements!
                    </Text>
                  </View>
                )}
                
                <Text style={[styles.achievementSubtitle, { color: theme.colors.text, marginTop: 20 }]}>
                  Locked ({lockedAchievements.length})
                </Text>
                
                <View style={styles.achievementsList}>
                  {lockedAchievements.map(achievement => (
                    <View 
                      key={achievement.id}
                      style={[styles.achievementCard, { 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8f8f8',
                        opacity: 0.7
                      }]}
                    >
                      <View style={[styles.achievementIconContainer, { backgroundColor: '#9E9E9E' }]}>
                        <MaterialCommunityIcons name={achievement.icon} size={24} color="white" />
                      </View>
                      
                      <View style={styles.achievementInfo}>
                        <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>
                          {achievement.title}
                        </Text>
                        <Text style={[styles.achievementDescription, { color: theme.colors.muted }]}>
                          {achievement.description}
                        </Text>
                        
                        {(achievement.progress !== undefined && achievement.maxProgress) && (
                          <View style={styles.achievementProgressContainer}>
                            <View style={[
                              styles.achievementProgressBar, 
                              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0' }
                            ]}>
                              <View 
                                style={[
                                  styles.achievementProgress, 
                                  { 
                                    width: `${(achievement.progress / achievement.maxProgress) * 100}%`, 
                                    backgroundColor: '#9E9E9E' 
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={[styles.progressText, { color: theme.colors.muted }]}>
                              {achievement.progress}/{achievement.maxProgress}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      <MaterialCommunityIcons name="lock" size={20} color="#9E9E9E" />
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {activeTab === 'challenges' && (
              <View style={styles.challengesContent}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Daily Challenges
                </Text>
                
                {/* This would be populated with daily challenges */}
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="flag-outline" size={48} color={theme.colors.muted} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.muted }]}>
                    Check back later for new daily challenges!
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  content: {
    padding: 16,
  },
  progressContent: {
    paddingBottom: 30,
  },
  levelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  levelCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  levelNumber: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  levelLabel: {
    color: 'white',
    fontSize: 12,
  },
  xpInfo: {
    flex: 1,
  },
  xpText: {
    fontSize: 16,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
  },
  xpToGo: {
    fontSize: 12,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '31%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  rewardsSection: {
    marginBottom: 16,
  },
  rewardsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  rewardCard: {
    borderRadius: 12,
    padding: 16,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  rewardDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  rewardProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rewardProgress: {
    height: '100%',
  },
  achievementsContent: {
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  achievementSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  achievementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 13,
  },
  achievementDate: {
    fontSize: 12,
    marginTop: 4,
  },
  achievementProgressContainer: {
    marginTop: 6,
  },
  achievementProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  achievementProgress: {
    height: '100%',
  },
  progressText: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  challengesContent: {
    paddingBottom: 30,
  },
});

export default GamificationPanel;
