import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomePage from './pages/Home/HomePage';
import DailyTrackerPage from './pages/DailyTracker/DailyTrackerPage';
import HabitManagementPage from './pages/HabitManagement/HabitManagementPage';
import StatisticsPage from './pages/Statistics/StatisticsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

// Define the correct type for icon names
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false, // Hide the default header for a cleaner UI
          tabBarIcon: ({ color, size }) => {
            let iconName: IconName;

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
            } else {
              // Provide a default icon
              iconName = 'help-circle';
            }

            return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#6200ee', // Active tab color
          tabBarInactiveTintColor: 'gray', // Inactive tab color
          tabBarStyle: {
            backgroundColor: '#f9f9f9', // Tab bar background
            borderTopWidth: 0, // Remove border
            elevation: 5, // Add shadow
          },
        })}
      >
        <Tab.Screen name="Home" component={HomePage} />
        <Tab.Screen name="Daily Tracker" component={DailyTrackerPage} />
        <Tab.Screen name="Manage Habits" component={HabitManagementPage} />
        <Tab.Screen name="Statistics" component={StatisticsPage} />
        <Tab.Screen name="Settings" component={SettingsPage} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}