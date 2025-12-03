// Infection Animations Component
// Provides animations for different infection types

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import LottieView from 'lottie-react-native';

interface InfectionAnimationProps {
  type: 'success' | 'burst' | 'mutation' | 'shockwave';
  onComplete?: () => void;
}

export function InfectionAnimation({ type, onComplete }: InfectionAnimationProps) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Start animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Fade out
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
        delay: 1000,
        useNativeDriver: true,
      }).start(() => {
        onComplete?.();
      });
    });
  }, []);

  const getAnimationContent = () => {
    switch (type) {
      case 'success':
        return (
          <Animated.View
            style={[
              styles.animationContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Text style={styles.successText}>✓ INFECTED</Text>
            <View style={styles.pulseCircle} />
          </Animated.View>
        );
      case 'burst':
        return (
          <Animated.View
            style={[
              styles.animationContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Text style={styles.burstText}>💥 CHAIN REACTION</Text>
            <View style={[styles.pulseCircle, styles.burstCircle]} />
          </Animated.View>
        );
      case 'mutation':
        return (
          <Animated.View
            style={[
              styles.animationContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Text style={styles.mutationText}>✨ MUTATION</Text>
            <View style={[styles.pulseCircle, styles.mutationCircle]} />
          </Animated.View>
        );
      case 'shockwave':
        return (
          <Animated.View
            style={[
              styles.animationContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Text style={styles.shockwaveText}>📡 PROXIMITY</Text>
            <View style={[styles.pulseCircle, styles.shockwaveCircle]} />
          </Animated.View>
        );
    }
  };

  return (
    <View style={styles.overlay}>
      {getAnimationContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 20,
    textShadowColor: '#00ff88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  burstText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 20,
  },
  mutationText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffd93d',
    marginBottom: 20,
  },
  shockwaveText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4dabf7',
    marginBottom: 20,
  },
  pulseCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#00ff88',
    backgroundColor: 'transparent',
  },
  burstCircle: {
    borderColor: '#ff6b6b',
    borderWidth: 6,
  },
  mutationCircle: {
    borderColor: '#ffd93d',
    borderWidth: 5,
  },
  shockwaveCircle: {
    borderColor: '#4dabf7',
    borderWidth: 5,
  },
});

