import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useStrain } from '../../hooks/useStrain';
import { StatsCard } from '../../components/ui/StatsCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Ionicons } from '@expo/vector-icons';

export default function StrainScreen() {
  const { user } = useAuth();
  const { strain, analytics, loading, error } = useStrain(
    user?.current_strain_id || null
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !strain || !analytics) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error?.message || 'Strain not found'} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Strain</Text>
        <Text style={styles.subtitle}>Infection analytics</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatsCard
          title="Total Infections"
          value={analytics.total_infections}
          subtitle="All time"
        />
        <StatsCard
          title="Direct"
          value={analytics.direct_infections}
          subtitle="Your tags"
        />
        <StatsCard
          title="Indirect"
          value={Math.round(analytics.indirect_infections)}
          subtitle="Lineage spread"
        />
        <StatsCard
          title="Depth"
          value={analytics.depth}
          subtitle="Generations"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generation Depth</Text>
        <ProgressBar
          progress={analytics.depth / 10} // Assuming max depth of 10 for visualization
          color="#007AFF"
        />
        <Text style={styles.progressText}>
          {analytics.depth} generation{analytics.depth !== 1 ? 's' : ''} deep
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Countries Reached</Text>
        {analytics.countries && analytics.countries.length > 0 ? (
          <View style={styles.countriesList}>
            {analytics.countries.map((country, index) => (
              <View key={index} style={styles.countryItem}>
                <Ionicons name="globe" size={16} color="#007AFF" />
                <Text style={styles.countryText}>{country}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No countries reached yet</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Outbreak Regions</Text>
        {analytics.top_regions && analytics.top_regions.length > 0 ? (
          <View style={styles.regionsList}>
            {analytics.top_regions.map((region, index) => (
              <View key={index} style={styles.regionItem}>
                <Text style={styles.regionName}>{region.name}</Text>
                <Text style={styles.regionCount}>{region.count} infections</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No regions data available</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Infected Users</Text>
        {analytics.infected_users && analytics.infected_users.length > 0 ? (
          <View style={styles.usersList}>
            {analytics.infected_users.map((infectedUser) => (
              <View key={infectedUser.id} style={styles.userItem}>
                <Ionicons name="person" size={16} color="#007AFF" />
                <Text style={styles.userText}>
                  {infectedUser.username || 'Anonymous'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No users infected yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  countriesList: {
    marginTop: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  countryText: {
    marginLeft: 8,
    fontSize: 14,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  regionsList: {
    marginTop: 8,
  },
  regionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  regionName: {
    fontSize: 14,
    fontWeight: '500',
  },
  regionCount: {
    fontSize: 14,
    color: '#666',
  },
  usersList: {
    marginTop: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  userText: {
    marginLeft: 8,
    fontSize: 14,
  },
});

