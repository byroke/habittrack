import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useTheme } from '../context/ThemeContext';

interface LevelUpNotificationProps {
  level: number;
  visible: boolean;
  onComplete: () => void;
}

const LevelUpNotification = ({ level, visible, onComplete }: LevelUpNotificationProps) => {
  const { theme } = useTheme();
  const scaleAnim = new Animated.Value(0);
  
  useEffect(() => {
    if (visible) {
      // Start the animation when the component becomes visible
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }).start();
      
      // Auto hide after 5 seconds
      const timer = setTimeout(() => {
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (onComplete) onComplete();
        });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <View style={styles.overlay}>
      <Animated.View 
        style={[
          styles.container, 
          { 
            backgroundColor: theme.colors.card,
            transform: [{ scale: scaleAnim }],
            opacity: scaleAnim,
            borderColor: theme.colors.primary,
          }
        ]}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
            <MaterialCommunityIcons name="star" size={32} color="white" />
          </View>
          <Text style={[styles.levelUpText, { color: theme.colors.primary }]}>Level Up!</Text>
          <Text style={[styles.levelText, { color: theme.colors.text }]}>You reached Level {level}</Text>
          <Text style={[styles.messageText, { color: theme.colors.muted }]}>
            Keep up the great work with your habits!
          </Text>
        </View>
        
        <View style={styles.animation}>
          <LottieView
            source={require('../../assets/animations/confetti.json')}
            autoPlay
            loop={false}
            style={styles.confetti}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    width: '80%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelUpText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  animation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confetti: {
    width: '100%',
    height: '100%',
  }
});

export default LevelUpNotification;
