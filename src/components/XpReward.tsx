import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface XpRewardProps {
  xpAmount: number;
  message?: string;
  position?: { top?: number; right?: number; bottom?: number; left?: number };
  onComplete?: () => void;
}

const XpReward = ({
  xpAmount,
  message,
  position = { top: 50, right: 16 },
  onComplete
}: XpRewardProps) => {
  const { theme } = useTheme();
  const translateY = new Animated.Value(0);
  const opacity = new Animated.Value(0);
  
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -20,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]),
      Animated.delay(1000),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -40,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  }, []);
  
  return (
    <Animated.View 
      style={[
        styles.container,
        position,
        {
          transform: [{ translateY }],
          opacity,
        }
      ]}
    >
      <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
        <MaterialCommunityIcons name="star" size={16} color="white" />
        <Text style={styles.xpText}>+{xpAmount} XP</Text>
      </View>
      {message && (
        <Text style={[styles.message, { color: theme.colors.text }]}>
          {message}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 9999,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  xpText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  message: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  }
});

export default XpReward;
