import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LeaderboardEntry as LeaderboardEntryType } from '../../types/database';

interface LeaderboardEntryProps {
  entry: LeaderboardEntryType;
}

export function LeaderboardEntry({ entry }: LeaderboardEntryProps) {
  return (
    <View style={styles.container}>
      <View style={styles.rankContainer}>
        <Text style={styles.rank}>#{entry.rank}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.username}>
          {entry.user?.username || 'Anonymous'}
        </Text>
        <Text style={styles.stats}>
          {entry.total_infections} infections • Depth: {entry.depth}
        </Text>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.score}>{Math.round(entry.score)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stats: {
    fontSize: 12,
    color: '#666',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});

