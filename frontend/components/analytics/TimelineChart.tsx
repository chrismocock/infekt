import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTimeline, TimelinePoint } from '../../hooks/useTimeline';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

interface TimelineChartProps {
  strainId: string | null;
}

export function TimelineChart({ strainId }: TimelineChartProps) {
  const [window, setWindow] = useState<'24h' | '7d' | '30d'>('24h');
  const { points, loading, error, refresh } = useTimeline(strainId, window);

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

  if (!points || points.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No timeline data available</Text>
      </View>
    );
  }

  // Calculate max count for scaling
  const maxCount = Math.max(...points.map((p) => p.count), 1);
  const chartHeight = 200;

  return (
    <View style={styles.container}>
      <View style={styles.windowSelector}>
        <TouchableOpacity
          style={[styles.windowButton, window === '24h' && styles.windowButtonActive]}
          onPress={() => setWindow('24h')}
        >
          <Text style={[styles.windowText, window === '24h' && styles.windowTextActive]}>
            24h
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.windowButton, window === '7d' && styles.windowButtonActive]}
          onPress={() => setWindow('7d')}
        >
          <Text style={[styles.windowText, window === '7d' && styles.windowTextActive]}>
            7d
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.windowButton, window === '30d' && styles.windowButtonActive]}
          onPress={() => setWindow('30d')}
        >
          <Text style={[styles.windowText, window === '30d' && styles.windowTextActive]}>
            30d
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartContainer}>
          <View style={styles.chart}>
            {points.map((point, index) => {
              const height = (point.count / maxCount) * chartHeight;
              const date = new Date(point.timestamp);
              const label = window === '24h' 
                ? date.getHours() + 'h'
                : date.getDate() + '/' + (date.getMonth() + 1);

              return (
                <View key={index} style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max(height, 4) },
                    ]}
                  />
                  <Text style={styles.barLabel}>{label}</Text>
                  <Text style={styles.barValue}>{point.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  windowSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  windowButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  windowButtonActive: {
    backgroundColor: '#007AFF',
  },
  windowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  windowTextActive: {
    color: '#fff',
  },
  chartContainer: {
    minWidth: '100%',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 250,
    paddingBottom: 40,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  bar: {
    width: '80%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
});

