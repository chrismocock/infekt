import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  PanResponder,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useLeaderboard, LeaderboardType } from '../../hooks/useLeaderboard';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LeaderboardEntry } from '../../types/database';
import LeaderboardTabs from '../../components/leaderboard/LeaderboardTabs';
import LeaderboardCard from '../../components/leaderboard/LeaderboardCard';
import UserRankBar from '../../components/leaderboard/UserRankBar';
import TopThreePodium from '../../components/leaderboard/TopThreePodium';
import ParticleBackground from '../../components/ParticleBackground';
import { getCountryFlagFromArray } from '../../lib/countryFlags';

const TAB_ORDER: LeaderboardType[] = ['global', 'city', 'strain', 'variant'];

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('global');
  const { entries, loading, error, refresh } = useLeaderboard(activeTab);
  const { user } = useAuth();
  
  // Track previous ranks for animation
  const previousRanksRef = useRef<Record<string, number>>({});

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderRelease: (_, gestureState) => {
        const swipeThreshold = 50;
        if (Math.abs(gestureState.dx) > swipeThreshold) {
          const currentIndex = TAB_ORDER.indexOf(activeTab);
          if (gestureState.dx > 0 && currentIndex > 0) {
            // Swipe right - previous tab
            setActiveTab(TAB_ORDER[currentIndex - 1]);
          } else if (gestureState.dx < 0 && currentIndex < TAB_ORDER.length - 1) {
            // Swipe left - next tab
            setActiveTab(TAB_ORDER[currentIndex + 1]);
          }
        }
      },
    })
  ).current;

  // Update previous ranks when entries change
  useEffect(() => {
    entries.forEach((entry) => {
      const key = entry.strain_id;
      if (!previousRanksRef.current[key]) {
        previousRanksRef.current[key] = entry.rank;
      }
    });
  }, []);

  // Find current user's entry in leaderboard
  const userEntry = entries.find(
    (entry) => entry.user?.id === user?.id
  );

  // Get user's rank, infections, and score
  const userRank = userEntry?.rank || entries.length + 1;
  const userInfections = userEntry?.total_infections || 0;
  const userScore = userEntry?.score || 0;

  const renderCard = ({ item }: { item: LeaderboardEntry }) => {
    const previousRank = previousRanksRef.current[item.strain_id];
    
    // Update previous rank after render
    if (previousRanksRef.current[item.strain_id] !== item.rank) {
      previousRanksRef.current[item.strain_id] = item.rank;
    }

    return (
      <LeaderboardCard
        rank={item.rank}
        previousRank={previousRank}
        name={item.user?.username || 'Anonymous'}
        infections={item.total_infections}
        depth={item.depth}
        countries={item.countries?.length || 0}
        countryCode={getCountryFlagFromArray(item.countries)}
        score={item.score}
      />
    );
  };

  if (loading && entries.length === 0) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error.message} onRetry={refresh} />
      </View>
    );
  }

  const topThree = entries.slice(0, 3);
  const allEntries = entries;

  const ListHeaderComponent = () => (
    <>
      {topThree.length >= 3 && <TopThreePodium players={topThree} />}
    </>
  );

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <ParticleBackground />
      <BlurView intensity={40} tint="light" style={styles.blurHeader}>
        <LeaderboardTabs active={activeTab} onChange={setActiveTab} />
      </BlurView>
      <View style={styles.content}>
        <FlatList
          data={allEntries}
          keyExtractor={(item) => item.strain_id}
          renderItem={renderCard}
          ListHeaderComponent={ListHeaderComponent}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={refresh}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={styles.userRankBarContainer}>
        <UserRankBar
          rank={userRank}
          infections={userInfections}
          score={userScore}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 80, // Space for blur header
    paddingBottom: 80, // Space for UserRankBar
  },
  blurHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  userRankBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
