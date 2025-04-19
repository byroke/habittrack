export type RootStackParamList = {
  Home: undefined;
  'Daily Tracker': { 
    selectedHabitId?: string;
    fromNotification?: boolean; 
  } | undefined;
  'Manage Habits': undefined;
  Statistics: undefined;
  Settings: { section?: string } | undefined;
};