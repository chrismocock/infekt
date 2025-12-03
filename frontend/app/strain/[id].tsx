import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getStrain } from '../../lib/api';
import { useStrainOutbreaks } from '../../hooks/useOutbreaks';
import { useTimeline } from '../../hooks/useTimeline';
import { TimelineChart } from '../../components/analytics/TimelineChart';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Card } from '../../components/ui/Card';

export default function StrainSharePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [strain, setStrain] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const { outbreaks } = useStrainOutbreaks(id);
  const { points } = useTimeline(id, '7d');

  React.useEffect(() => {
    const loadStrain = async () => {
      try {
        setLoading(true);
        const data = await getStrain(id);
        setStrain(data.strain);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadStrain();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !strain) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error?.message || 'Strain not found'} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Strain Profile</Text>
        <Text style={styles.subtitle}>Share this strain's progress</Text>
      </View>

      <Card style={styles.statsCard}>
        <Text style={styles.statsTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{strain.total_infections || 0}</Text>
            <Text style={styles.statLabel}>Total Infections</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{strain.depth || 0}</Text>
            <Text style={styles.statLabel}>Lineage Depth</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Array.isArray(strain.countries) ? strain.countries.length : 0}
            </Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{outbreaks.length}</Text>
            <Text style={styles.statLabel}>Outbreaks</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>7-Day Infection Curve</Text>
        <TimelineChart strainId={id} />
      </Card>

      {outbreaks.length > 0 && (
        <Card style={styles.outbreaksCard}>
          <Text style={styles.outbreaksTitle}>Recent Outbreaks</Text>
          {outbreaks.slice(0, 5).map((outbreak) => (
            <View key={outbreak.id} style={styles.outbreakItem}>
              <Text style={styles.outbreakType}>{outbreak.type.toUpperCase()}</Text>
              <Text style={styles.outbreakDescription}>{outbreak.description}</Text>
              <Text style={styles.outbreakDetails}>
                {outbreak.multiplier}x multiplier • {outbreak.tag_count} tags
              </Text>
            </View>
          ))}
        </Card>
      )}

      <View style={styles.shareSection}>
        <Text style={styles.shareText}>
          Share this strain: {`https://infekt.app/strain/${id}`}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  statsCard: {
    margin: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  chartCard: {
    margin: 16,
    marginTop: 0,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  outbreaksCard: {
    margin: 16,
    marginTop: 0,
  },
  outbreaksTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  outbreakItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  outbreakType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 4,
  },
  outbreakDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  outbreakDetails: {
    fontSize: 12,
    color: '#666',
  },
  shareSection: {
    padding: 16,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
  },
  shareText: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
  },
});

