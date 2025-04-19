import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';

// Extend the global object to include HapticFeedback
declare global {
  interface Global {
    HapticFeedback?: {
      impactLight: () => void;
    };
  }
}

// Import notification utilities
import { 
  registerForPushNotificationsAsync, 
  cancelAllHabitReminders
} from '../../../utils/fixedNotifications';
import * as Notifications from 'expo-notifications';

// Define settings type for type safety
type AppSettings = {
  notificationsEnabled: boolean;
  reminderTime: string;
  weekStartsOn: string;
  dataBackup: boolean;
  clearCompletedAfterDays: number;
  defaultReminderTime: string;
};

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  reminderTime: '20:00',
  weekStartsOn: 'Monday',
  dataBackup: false,
  clearCompletedAfterDays: 30,
  defaultReminderTime: '20:00',
};

export default function SettingsPage() {
  const { userName, updateUserName } = useUser();
  const { theme, toggleTheme, isDark, setScheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempUserName, setTempUserName] = useState<string>('');
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [showWeekStartModal, setShowWeekStartModal] = useState<boolean>(false);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [rotationValue, setRotationValue] = useState(0);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const themeIconAnim = useRef(new Animated.Value(0)).current;
  
  // Load settings when component mounts
  useFocusEffect(
    useCallback(() => {
      loadSettings();
      
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        })
      ]).start();
    }, [])
  );

  // Update theme icon animation based on current theme
  useEffect(() => {
    Animated.timing(themeIconAnim, {
      toValue: isDark ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Rotate animation when theme changes
    setRotationValue(prevValue => prevValue + 1);
    Animated.timing(rotateAnim, {
      toValue: rotationValue + 1,
      duration: 400,
      easing: Easing.elastic(1),
      useNativeDriver: true
    }).start();
  }, [isDark]);

  // Load settings from AsyncStorage
  const loadSettings = async () => {
    setLoading(true);
    try {
      const storedSettings = await AsyncStorage.getItem('appSettings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Could not load your settings.');
    } finally {
      setLoading(false);
    }
  };

  // Save settings to AsyncStorage
  const saveSettings = async (updatedSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Could not save your settings.');
    }
  };

  // Update a single setting
  const updateSetting = (key: keyof AppSettings, value: any) => {
    global.HapticFeedback?.impactLight();
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  // Handle dark mode toggle with animation
  const handleThemeToggle = () => {
    // Play haptic feedback if available
    if ((global as any).HapticFeedback) {
      global.HapticFeedback.impactLight();
    }
    
    // Toggle theme
    toggleTheme();
  };

  // Set theme mode with animation and close modal
  const handleThemeSelect = (mode: 'light' | 'dark' | 'system') => {
    setScheme(mode);
    setShowThemeModal(false);
  };

  // Handle user name update
  const handleUpdateUserName = async () => {
    if (tempUserName.trim()) {
      try {
        await updateUserName(tempUserName);
        setIsEditingName(false);
      } catch (error) {
        Alert.alert('Error', 'Could not save your name. Please try again.');
      }
    }
  };

  // Handle export data
  const handleExportData = async () => {
    try {
      // Get all data from AsyncStorage
      const habits = await AsyncStorage.getItem('habits');
      
      if (habits) {
        // In a real app, we would export this data to a file or cloud
        Alert.alert(
          'Data Ready for Export',
          'Your habit data would be exported in a real app. This is a placeholder.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('No Data', 'There is no habit data to export.');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Could not export your data.');
    }
  };

  // Handle import data (placeholder)
  const handleImportData = () => {
    Alert.alert(
      'Import Data',
      'This feature would allow importing data in a real app. This is a placeholder.',
      [{ text: 'OK' }]
    );
  };

  // Handle clear all data
  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all your habit data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Data', 
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('habits');
              Alert.alert('Success', 'All habit data has been cleared.');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Could not clear your data.');
            }
          },
          style: 'destructive' 
        }
      ]
    );
  };

  // Calculate theme icon rotation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  // Render loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.primary }]}>
          Loading settings...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={[
        styles.header, 
        { 
          backgroundColor: theme.colors.background,
        },
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Settings</Text>
      </Animated.View>

      <ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Animated.View style={[
          styles.section, 
          { 
            backgroundColor: isDark ? 'transparent' : 'transparent',
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            paddingBottom: 20
          },
          { 
            opacity: fadeAnim, 
            transform: [
              { translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })},
              { scale: scaleAnim }
            ]
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Profile</Text>
          
          <View style={styles.profileContainer}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons name="account-circle" size={60} color={theme.colors.primary} />
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: theme.colors.text }]}>{userName}</Text>
              <TouchableOpacity 
                style={[
                  styles.editProfileButton, 
                  { backgroundColor: theme.dark ? 'rgba(98, 0, 238, 0.2)' : theme.colors.lightBackground }
                ]}
                onPress={() => {
                  setTempUserName(userName);
                  setIsEditingName(true);
                }}
              >
                <Text style={[styles.editProfileButtonText, { color: theme.colors.primary }]}>
                  Edit Profile
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Appearance Settings */}
        <Animated.View style={[
          styles.section, 
          { 
            backgroundColor: isDark ? 'transparent' : 'transparent',
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border
          },
          { 
            opacity: fadeAnim, 
            transform: [
              { translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0],
              })},
              { scale: scaleAnim }
            ]
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <MaterialCommunityIcons 
                  name="theme-light-dark" 
                  size={22} 
                  color={theme.colors.primary} 
                  style={styles.settingIcon} 
                />
              </Animated.View>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Dark Mode</Text>
            </View>
            
            <Switch
              value={isDark}
              onValueChange={handleThemeToggle}
              trackColor={{ false: "#e0e0e0", true: "#b39ddb" }}
              thumbColor={isDark ? theme.colors.primary : "#f4f3f4"}
              ios_backgroundColor="#e0e0e0"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowThemeModal(true)}
          >
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons 
                name="palette-outline" 
                size={22} 
                color={theme.colors.primary} 
                style={styles.settingIcon} 
              />
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Theme Mode</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={[styles.settingValueText, { color: theme.colors.muted }]}>
                {isDark ? 'Dark' : 'Light'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.muted} />
            </View>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Notification Settings */}
        <Animated.View style={[
          styles.section, 
          { 
            backgroundColor: isDark ? 'transparent' : 'transparent',
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border
          },
          { 
            opacity: fadeAnim, 
            transform: [
              { translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [60, 0],
              })},
              { scale: scaleAnim }
            ]
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons 
                name="bell-outline" 
                size={22}
                color={theme.colors.primary} 
                style={styles.settingIcon} 
              />
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Daily Reminders</Text>
            </View>
            
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) => updateSetting('notificationsEnabled', value)}
              trackColor={{ false: "#e0e0e0", true: "#b39ddb" }}
              thumbColor={settings.notificationsEnabled ? theme.colors.primary : "#f4f3f4"}
              ios_backgroundColor="#e0e0e0"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowTimeModal(true)}
          >
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons 
                name="clock-outline" 
                size={22} 
                color={theme.colors.primary} 
                style={styles.settingIcon} 
              />
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Reminder Time</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={[styles.settingValueText, { color: theme.colors.muted }]}>
                {settings.reminderTime}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.muted} />
            </View>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Data Management */}
        <Animated.View style={[
          styles.section, 
          { 
            backgroundColor: isDark ? 'transparent' : 'transparent',
          },
          { 
            opacity: fadeAnim, 
            transform: [
              { translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [80, 0],
              })},
              { scale: scaleAnim }
            ]
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Data Management</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleExportData}
          >
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons 
                name="export" 
                size={22} 
                color={theme.colors.primary} 
                style={styles.settingIcon} 
              />
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Export Data</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.muted} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleImportData}
          >
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons 
                name="import" 
                size={22} 
                color={theme.colors.primary} 
                style={styles.settingIcon} 
              />
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Import Data</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.muted} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleClearData}
          >
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons 
                name="delete-outline" 
                size={22} 
                color={'#FF5252'} 
                style={styles.settingIcon} 
              />
              <Text style={[styles.settingLabel, { color: '#FF5252' }]}>Clear All Data</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.muted} />
          </TouchableOpacity>
          
          <View style={styles.appInfoContainer}>
            <Text style={[styles.appVersionText, { color: theme.colors.muted }]}>
              Habit Tracker v1.0.0
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
      
      {/* Theme Mode Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowThemeModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Theme Mode
                </Text>
                
                <TouchableOpacity 
                  style={[
                    styles.modalOption, 
                    { borderBottomColor: theme.colors.border }
                  ]}
                  onPress={() => handleThemeSelect('light')}
                >
                  <View style={styles.modalOptionContent}>
                    <MaterialCommunityIcons name="white-balance-sunny" size={22} color={isDark ? "#FFD700" : "#FF9800"} />
                    <Text style={[styles.modalOptionText, { color: theme.colors.text }]}>Light</Text>
                  </View>
                  {!isDark && (
                    <MaterialCommunityIcons name="check" size={22} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.modalOption,
                    { borderBottomColor: theme.colors.border }
                  ]}
                  onPress={() => handleThemeSelect('dark')}
                >
                  <View style={styles.modalOptionContent}>
                    <MaterialCommunityIcons name="moon-waning-crescent" size={22} color={isDark ? theme.colors.primary : "#6200ee"} />
                    <Text style={[styles.modalOptionText, { color: theme.colors.text }]}>Dark</Text>
                  </View>
                  {isDark && (
                    <MaterialCommunityIcons name="check" size={22} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => handleThemeSelect('system')}
                >
                  <View style={styles.modalOptionContent}>
                    <MaterialCommunityIcons name="theme-light-dark" size={22} color={theme.colors.primary} />
                    <Text style={[styles.modalOptionText, { color: theme.colors.text }]}>System Default</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowThemeModal(false)}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      {/* Time Picker Modal */}
      <Modal
        visible={showTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowTimeModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Set Reminder Time
                </Text>
                
                {/* Simple time picker options */}
                <ScrollView style={styles.timePickerContainer}>
                  {['06:00', '08:00', '12:00', '15:00', '18:00', '20:00', '21:00', '22:00'].map((time) => (
                    <TouchableOpacity 
                      key={time}
                      style={[
                        styles.timeOption, 
                        settings.reminderTime === time && {
                          backgroundColor: theme.colors.lightBackground
                        }
                      ]}
                      onPress={() => {
                        updateSetting('reminderTime', time);
                        setShowTimeModal(false);
                      }}
                    >
                      <Text style={[
                        styles.timeOptionText, 
                        { color: theme.colors.text },
                        settings.reminderTime === time && {
                          fontWeight: 'bold',
                          color: theme.colors.primary
                        }
                      ]}>
                        {time}
                      </Text>
                      {settings.reminderTime === time && (
                        <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowTimeModal(false)}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      {/* User Name Edit Modal */}
      <Modal
        visible={isEditingName}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditingName(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEditingName(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    Edit Your Name
                  </Text>
                  
                  <TextInput
                    style={[
                      styles.modalInput, 
                      { 
                        borderColor: theme.colors.border,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                        color: theme.colors.text 
                      }
                    ]}
                    value={tempUserName}
                    onChangeText={setTempUserName}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.colors.muted}
                    autoFocus={true}
                  />
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[
                        styles.modalButton, 
                        { 
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0',
                          marginRight: 8
                        }
                      ]}
                      onPress={() => setIsEditingName(false)}
                    >
                      <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.modalButton, 
                        { backgroundColor: theme.colors.primary }
                      ]}
                      onPress={handleUpdateUserName}
                    >
                      <Text style={styles.modalButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  editProfileButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  editProfileButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 14,
    marginRight: 6,
  },
  appInfoContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  appVersionText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  timePickerContainer: {
    maxHeight: 240,
    marginBottom: 20,
  },
  timeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  timeOptionText: {
    fontSize: 16,
  },
});