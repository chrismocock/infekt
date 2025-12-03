import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  height?: number;
  useGradient?: boolean;
  gradientColors?: string[];
}

export function ProgressBar({
  progress,
  color = '#007AFF',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  height = 8,
  useGradient = false,
  gradientColors = ['#9D4EDD', '#C77DFF', '#9D4EDD'],
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.container, { backgroundColor, height, borderRadius: height / 2 }]}>
      {useGradient ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.progress,
            {
              width: `${clampedProgress * 100}%`,
              height,
              borderRadius: height / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.progress,
            {
              width: `${clampedProgress * 100}%`,
              backgroundColor: color,
              height,
              borderRadius: height / 2,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    shadowColor: '#9D4EDD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  progress: {
    shadowColor: '#9D4EDD',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
});

