import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface NeonButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export function NeonButton({ title, onPress, style, disabled = false }: NeonButtonProps) {
  const glow = useRef(new Animated.Value(0.5)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Subtle pulse animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    glowAnimation.start();
  }, []);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const glowOpacity = glow.interpolate({
    inputRange: [0.5, 1, 1.2],
    outputRange: [0.3, 0.6, 0.72],
  });

  const animatedButtonStyle = {
    transform: [{ scale }],
  };

  return (
    <Animated.View style={[style, animatedButtonStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
      >
        {/* Glow effect */}
        <Animated.View style={[styles.glowContainer, { opacity: glowOpacity }]}>
          <LinearGradient
            colors={['rgba(2, 123, 255, 0.6)', 'rgba(75, 198, 255, 0.6)']}
            style={styles.glow}
          />
        </Animated.View>

      {/* Button */}
      <LinearGradient
        colors={['#027BFF', '#4BC6FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.button, disabled && styles.disabled]}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" style={styles.icon} />
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowContainer: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 28,
    zIndex: -1,
  },
  glow: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: '#4BC6FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

