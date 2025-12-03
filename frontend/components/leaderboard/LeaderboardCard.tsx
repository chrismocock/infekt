import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableWithoutFeedback } from 'react-native';

interface LeaderboardCardProps {
  rank: number;
  previousRank?: number;
  name: string;
  infections: number;
  depth: number;
  countries: number;
  countryCode?: string;
  score: number;
}

export default function LeaderboardCard({
  rank,
  previousRank,
  name,
  infections,
  depth,
  countries,
  countryCode,
  score,
}: LeaderboardCardProps) {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (previousRank !== undefined && previousRank !== rank) {
      flashAnim.setValue(1);

      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [rank, previousRank]);

  useEffect(() => {
    Animated.timing(scoreAnim, {
      toValue: score,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const isUp = previousRank !== undefined && rank < previousRank;
  const flashColor = isUp ? '#DFFFE3' : '#FFE8E8';

  const bgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFF', flashColor],
  });

  const rankColor =
    rank === 1 ? '#FFD700' :
    rank === 2 ? '#C0C0C0' :
    rank === 3 ? '#CD7F32' :
    '#E5E5E5';

  const [displayScore, setDisplayScore] = React.useState(0);

  useEffect(() => {
    const listenerId = scoreAnim.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });
    return () => {
      scoreAnim.removeListener(listenerId);
    };
  }, [score]);

  return (
    <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.card, { backgroundColor: bgColor, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.rankContainer}>
          {rank <= 3 && <View style={[styles.glow, rank === 1 && styles.glowGold]} />}
          <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.name}>
            {countryCode ? `${countryCode} ` : ''}{name}
          </Text>
          <Text style={styles.stats}>
            🦠 {infections}   •   🧬 {depth}   •   🌍 {countries}
          </Text>
        </View>

        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{displayScore || Math.round(score)}</Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  rankContainer: {
    position: 'relative',
    marginRight: 12,
  },
  glow: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    top: -7,
    left: -7,
  },
  glowGold: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  infoSection: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  stats: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  scoreBadge: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#2D6CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});

