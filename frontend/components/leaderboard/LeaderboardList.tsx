import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { LeaderboardEntry } from '../../types/database';
import { LeaderboardEntry as EntryComponent } from './LeaderboardEntry';

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function LeaderboardList({
  entries,
  onRefresh,
  refreshing = false,
}: LeaderboardListProps) {
  return (
    <FlatList
      data={entries}
      renderItem={({ item }) => <EntryComponent entry={item} />}
      keyExtractor={(item) => item.strain_id}
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
});

