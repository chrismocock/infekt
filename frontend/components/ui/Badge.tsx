import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  style?: any;
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], style]}>
      <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: '#E5E5EA',
  },
  success: {
    backgroundColor: '#34C759',
  },
  warning: {
    backgroundColor: '#FF9500',
  },
  error: {
    backgroundColor: '#FF3B30',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  defaultText: {
    color: '#000',
  },
  successText: {
    color: '#fff',
  },
  warningText: {
    color: '#fff',
  },
  errorText: {
    color: '#fff',
  },
});

