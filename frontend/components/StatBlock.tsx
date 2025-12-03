import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GlassCard } from './GlassCard';

interface StatBlockProps {
  value: string | number;
  label: string;
  style?: any;
  compact?: boolean;
  onPress?: () => void;
}

export function StatBlock({ value, label, style, compact = false, onPress }: StatBlockProps) {
  const content = (
    <GlassCard
      style={[styles.container, compact && styles.containerCompact, style]}
      borderRadius={compact ? 20 : 24}
    >
      <View style={styles.content}>
        <Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text>
        <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      </View>
    </GlassCard>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressablePressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 24,
  },
  pressablePressed: {
    transform: [{ scale: 0.98 }],
  },
  container: {
    padding: 16,
    minHeight: 80,
  },
  containerCompact: {
    padding: 12,
    minHeight: 60,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  valueCompact: {
    fontSize: 20,
  },
  label: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelCompact: {
    fontSize: 11,
  },
});
