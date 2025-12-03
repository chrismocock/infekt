import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useOutbreaks, OutbreakEvent } from '../../hooks/useOutbreaks';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

interface OutbreakFeedProps {
  region?: string;
  hours?: number;
  onEventPress?: (event: OutbreakEvent) => void;
}

export function OutbreakFeed({ region, hours = 24, onEventPress }: OutbreakFeedProps) {
  const { events, loading, error, refresh } = useOutbreaks(region, hours);

  if (loading) {
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

  const renderEvent = ({ item }: { item: OutbreakEvent }) => {
    const typeEmojis: Record<string, string> = {
      club: '🎉',
      university: '🎓',
      airport: '✈️',
      stadium: '🏟️',
      festival: '🎪',
      general: '🦠',
    };

    return (
      <TouchableOpacity onPress={() => onEventPress?.(item)}>
        <Card style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventEmoji}>
              {typeEmojis[item.type] || '🦠'}
            </Text>
            <View style={styles.eventInfo}>
              <Text style={styles.eventType}>{item.type.toUpperCase()}</Text>
              <Text style={styles.eventDescription}>{item.description}</Text>
              <Text style={styles.eventDetails}>
                {item.username} • {item.multiplier}x multiplier • {item.tag_count} tags
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={refresh}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No outbreak events in the last {hours} hours</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  eventCard: {
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 12,
    color: '#666',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

