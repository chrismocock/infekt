import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface UserRankBarProps {
  rank: number;
  infections: number;
  score: number;
}

export default function UserRankBar({ rank, infections, score }: UserRankBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Your Rank: #{rank}</Text>
      <Text style={styles.text}>🦠 {infections}</Text>
      <Text style={styles.text}>⭐ {Math.round(score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    backgroundColor: '#FFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
});

