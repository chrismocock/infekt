import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LeaderboardType } from '../../hooks/useLeaderboard';

interface LeaderboardTabsProps {
  active: LeaderboardType;
  onChange: (tab: LeaderboardType) => void;
}

const TABS: { key: LeaderboardType; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'city', label: 'City' },
  { key: 'strain', label: 'Strain' },
  { key: 'variant', label: 'Variant' },
];

export default function LeaderboardTabs({ active, onChange }: LeaderboardTabsProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, isActive && styles.activeTab]}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2D6CF6',
  },
  label: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  activeLabel: {
    color: '#FFF',
  },
});
