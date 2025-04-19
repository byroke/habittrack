import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { initializeNotifications } from './utils/fixedNotifications';
import HomePage from './src/pages/Home/HomePage';
import DailyTrackerPage from './src/pages/DailyTracker/DailyTrackerPage';
import HabitManagementPage from './src/pages/HabitManagement/HabitManagementPage';
import StatisticsPage from './src/pages/Statistics/StatisticsPage';
import SettingsPage from './src/pages/Settings/SettingsPage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { UserProvider } from './src/context/UserContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { RootStackParamList } from './navigation/types';

// Define the correct type for icon names
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const Tab = createBottomTabNavigator();

// Create a navigation reference that can be used outside of components
const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Function to navigate when app is ready
function navigate(name: keyof RootStackParamList, params: any) {
  if (navigationRef.isReady()) {
    // @ts-ignore: We know these params are valid for this route
    navigationRef.navigate(name, params);
  }
}

// Main tab navigator component that uses theme context
function MainApp() {
  const { theme, isDark } = useTheme();
  
  // Initialize notifications when app starts
  useEffect(() => {
    // Configure notification appearance for when the app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Initialize the notification system
    const setupNotifications = async () => {
      const success = await initializeNotifications();
      
      if (!success) {
        Alert.alert(
          "Notifications Disabled",
          "Habit reminders require notifications to be enabled. You can enable them in your device settings.",
          [{ text: "OK" }]
        );
      }
    };
    
    setupNotifications();
    
    // Set up notification handler for when app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // Set up handler for when user taps on a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped, data:', data);
      
      // Navigate to the appropriate screen based on notification data
      if (data && data.habitId) {
        // Navigate to Daily Tracker with the selected habit
        navigate('Daily Tracker', { 
          selectedHabitId: data.habitId,
          fromNotification: true
        });
      }
    });

    // Clean up listeners on unmount
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarIcon: ({ color }) => {
            let iconName: IconName = 'help-circle';

            // Set icons for each tab
            if (route.name === 'Home') {
              iconName = 'home';
            } else if (route.name === 'Daily Tracker') {
              iconName = 'calendar-check';
            } else if (route.name === 'Manage Habits') {
              iconName = 'clipboard-text-outline';
            } else if (route.name === 'Statistics') {
              iconName = 'chart-bar';
            } else if (route.name === 'Settings') {
              iconName = 'cog';
            }

            // Larger icon size (increased from default)
            const iconSize = 28;
            return <MaterialCommunityIcons name={iconName} size={iconSize} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopWidth: 0,
            elevation: 5,
            height: 60, // Slightly increase tab bar height to accommodate larger icons
          },
          tabBarItemStyle: {
            paddingVertical: 10, // Add padding to center icons vertically
            justifyContent: 'center', // Center the icons vertically
          },
        })}
      >
        <Tab.Screen name="Home" component={HomePage} />
        <Tab.Screen name="Daily Tracker" component={DailyTrackerPage} />
        <Tab.Screen name="Manage Habits" component={HabitManagementPage} />
        <Tab.Screen name="Statistics" component={StatisticsPage} />
        <Tab.Screen name="Settings" component={SettingsPage} />
      </Tab.Navigator>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer ref={navigationRef}>
          <UserProvider>
            <MainApp />
          </UserProvider>
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}