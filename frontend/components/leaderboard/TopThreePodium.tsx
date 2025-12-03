import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LeaderboardEntry } from '../../types/database';
import { getCountryFlagFromArray } from '../../lib/countryFlags';

interface TopThreePodiumProps {
  players: LeaderboardEntry[];
}

export default function TopThreePodium({ players }: TopThreePodiumProps) {
  if (players.length < 3) return null;

  const [first, second, third] = players;

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    return '#CD7F32';
  };

  const getRankSize = (rank: number) => {
    if (rank === 1) return 80;
    if (rank === 2) return 60;
    return 60;
  };

  return (
    <View style={styles.container}>
      <View style={styles.podium}>
        {/* Second place (left) */}
        <View style={styles.podiumItem}>
          <View
            style={[
              styles.avatar,
              {
                width: getRankSize(2),
                height: getRankSize(2),
                backgroundColor: getRankColor(2),
              },
            ]}
          >
            <Text style={styles.rankNumber}>2</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {getCountryFlagFromArray(second.countries)} {second.user?.username || 'Anonymous'}
          </Text>
          <Text style={styles.score}>{Math.round(second.score)}</Text>
        </View>

        {/* First place (center) */}
        <View style={styles.podiumItem}>
          <View
            style={[
              styles.avatar,
              {
                width: getRankSize(1),
                height: getRankSize(1),
                backgroundColor: getRankColor(1),
              },
            ]}
          >
            <Text style={styles.rankNumber}>1</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {getCountryFlagFromArray(first.countries)} {first.user?.username || 'Anonymous'}
          </Text>
          <Text style={styles.score}>{Math.round(first.score)}</Text>
        </View>

        {/* Third place (right) */}
        <View style={styles.podiumItem}>
          <View
            style={[
              styles.avatar,
              {
                width: getRankSize(3),
                height: getRankSize(3),
                backgroundColor: getRankColor(3),
              },
            ]}
          >
            <Text style={styles.rankNumber}>3</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {getCountryFlagFromArray(third.countries)} {third.user?.username || 'Anonymous'}
          </Text>
          <Text style={styles.score}>{Math.round(third.score)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingVertical: 16,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 12,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
  },
  avatar: {
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  rankNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
    marginBottom: 4,
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D6CF6',
  },
});

