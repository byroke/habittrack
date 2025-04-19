import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { scheduleSnoozeReminder } from '../../utils/fixedNotifications';
import { Habit } from '../../utils/localStorage';

type NotificationHandlerProps = {
  visible: boolean;
  onClose: () => void;
  onCompleteHabit: () => void;
  habit: Habit | null;
};

/**
 * Component that shows when a user taps on a notification
 * Allows quick completion of a habit or snoozing the reminder
 */
export default function NotificationHandler({
  visible,
  onClose,
  onCompleteHabit,
  habit
}: NotificationHandlerProps) {
  const { theme } = useTheme();
  
  // Can't do anything if no habit is provided
  if (!habit) {
    return null;
  }

  // Handle snoozing the notification
  const handleSnooze = async (minutes: number) => {
    // Schedule a new reminder for X minutes from now
    await scheduleSnoozeReminder(habit, minutes);
    onClose();
  };
  
  // Handle completing the habit
  const handleComplete = () => {
    onCompleteHabit();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.headerText, { color: theme.colors.text }]}>
            Time for your habit
          </Text>
          
          <Text style={[styles.habitTitle, { color: theme.colors.primary }]}>
            {habit.title}
          </Text>
          
          {habit.description ? (
            <Text style={[styles.habitDescription, { color: theme.colors.text }]}>
              {habit.description}
            </Text>
          ) : null}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={handleComplete}
            >
              <Text style={styles.buttonText}>Complete</Text>
            </TouchableOpacity>
            
            <View style={styles.snoozeContainer}>
              <Text style={[styles.snoozeText, { color: theme.colors.text }]}>
                Snooze for:
              </Text>
              <View style={styles.snoozeButtons}>
                <TouchableOpacity 
                  style={[styles.snoozeButton, { backgroundColor: theme.colors.background }]}
                  onPress={() => handleSnooze(15)}
                >
                  <Text style={[styles.snoozeButtonText, { color: theme.colors.primary }]}>15m</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.snoozeButton, { backgroundColor: theme.colors.background }]}
                  onPress={() => handleSnooze(30)}
                >
                  <Text style={[styles.snoozeButtonText, { color: theme.colors.primary }]}>30m</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.snoozeButton, { backgroundColor: theme.colors.background }]}
                  onPress={() => handleSnooze(60)}
                >
                  <Text style={[styles.snoozeButtonText, { color: theme.colors.primary }]}>1h</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    width: '80%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 10,
  },
  habitTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  habitDescription: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 10,
  },
  button: {
    borderRadius: 12,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  snoozeContainer: {
    width: '100%',
    marginTop: 10,
  },
  snoozeText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  snoozeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  snoozeButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  snoozeButtonText: {
    fontWeight: '500',
    fontSize: 14,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  closeButtonText: {
    fontSize: 16,
  },
});
