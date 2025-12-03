import React from 'react';
import { View, StyleSheet, Image, ViewStyle, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glowEffect } from '../theme/effects';

interface VirusAnimatedLogoProps {
  size?: number;
  style?: ViewStyle;
}

export function VirusAnimatedLogo({ size, style }: VirusAnimatedLogoProps) {
  const { width } = useWindowDimensions();
  
  // Responsive sizing: if size not provided, use screen width
  const defaultSize = width < 400 ? 180 : 240;
  const logoSize = size || defaultSize;

  // TODO: Re-enable Lottie animation once properly configured
  // For now, using static image to prevent crashes
  const useLottie = false;

  return (
    <View style={[styles.container, { width: logoSize, height: logoSize }, style]}>
      {/* Cyan/blue radial glow effect */}
      <View style={[styles.glowWrapper, glowEffect]}>
        <LinearGradient
          colors={['rgba(0, 207, 255, 0.3)', 'rgba(75, 198, 255, 0.4)', 'rgba(0, 207, 255, 0.3)']}
          style={styles.glowGradient}
        />
      </View>

      {/* Static image (Lottie disabled temporarily to prevent crashes) */}
      <Image
        source={require('../assets/virus.png')}
        style={[styles.fallbackImage, { width: logoSize, height: logoSize }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowWrapper: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 200,
    overflow: 'hidden',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 200,
  },
  animation: {
    zIndex: 1,
  },
  fallbackImage: {
    zIndex: 1,
  },
});

