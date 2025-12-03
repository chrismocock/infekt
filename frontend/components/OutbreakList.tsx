import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';
import { Ionicons } from '@expo/vector-icons';

interface Outbreak {
  id: string;
  location: string;
  cases: number;
  timestamp: string;
}

interface OutbreakListProps {
  outbreaks?: Outbreak[];
}

export function OutbreakList({ outbreaks = [] }: OutbreakListProps) {
  if (outbreaks.length === 0) {
    return (
      <GlassCard style={styles.emptyCard}>
        <View style={styles.emptyContent}>
          <Ionicons name="pulse-outline" size={32} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyText}>No activity yet</Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <View style={styles.container}>
      {outbreaks.map((outbreak) => (
        <GlassCard key={outbreak.id} style={styles.outbreakCard}>
          <View style={styles.outbreakContent}>
            <View style={styles.outbreakHeader}>
              <Ionicons name="location" size={20} color="#4BC6FF" />
              <Text style={styles.location}>{outbreak.location}</Text>
            </View>
            <View style={styles.outbreakStats}>
              <Text style={styles.cases}>{outbreak.cases} cases</Text>
              <Text style={styles.timestamp}>{outbreak.timestamp}</Text>
            </View>
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // gap handled by marginBottom on individual cards
  },
  emptyCard: {
    padding: 32,
    minHeight: 120,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 12,
  },
  outbreakCard: {
    padding: 16,
    marginBottom: 12,
  },
  outbreakContent: {
    gap: 8,
  },
  outbreakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  location: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  outbreakStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cases: {
    fontSize: 14,
    color: '#4BC6FF',
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

