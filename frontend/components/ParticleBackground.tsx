import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function ParticleBackground() {
  return (
    <View style={styles.container}>
      {Array.from({ length: 20 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.particle,
            {
              top: Math.random() * 600,
              left: Math.random() * 300,
              opacity: 0.05,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2D6CF6',
  },
});

