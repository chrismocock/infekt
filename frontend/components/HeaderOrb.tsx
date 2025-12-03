import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop, Ellipse } from 'react-native-svg';

export function HeaderOrb() {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous scale animation (100-103%)
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.03,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Glow pulse animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    scaleAnimation.start();
    glowAnimation.start();
  }, []);

  const animatedStyle = {
    transform: [{ scale }],
  };

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  // Virus dimensions
  const centerX = 60;
  const centerY = 60;
  const virusRadius = 35; // Central sphere radius
  const spikeCount = 8;
  const spikeLength = 18;
  const spikeBaseWidth = 10;
  const spikeMidWidth = 6;
  const spikeTipWidth = 8;
  const spikeTipHeight = 5;

  // Generate club-shaped spike paths with oval tip
  const generateSpikePath = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    const startX = centerX + virusRadius * Math.cos(rad);
    const startY = centerY + virusRadius * Math.sin(rad);
    
    // Base of spike (wider)
    const perpAngle = rad + Math.PI / 2;
    const baseLeftX = startX + (spikeBaseWidth / 2) * Math.cos(perpAngle);
    const baseLeftY = startY + (spikeBaseWidth / 2) * Math.sin(perpAngle);
    const baseRightX = startX - (spikeBaseWidth / 2) * Math.cos(perpAngle);
    const baseRightY = startY - (spikeBaseWidth / 2) * Math.sin(perpAngle);
    
    // Mid point (narrower)
    const midLength = spikeLength * 0.6;
    const midX = centerX + (virusRadius + midLength) * Math.cos(rad);
    const midY = centerY + (virusRadius + midLength) * Math.sin(rad);
    const midLeftX = midX + (spikeMidWidth / 2) * Math.cos(perpAngle);
    const midLeftY = midY + (spikeMidWidth / 2) * Math.sin(perpAngle);
    const midRightX = midX - (spikeMidWidth / 2) * Math.cos(perpAngle);
    const midRightY = midY - (spikeMidWidth / 2) * Math.sin(perpAngle);
    
    // Tip (flared out)
    const tipX = centerX + (virusRadius + spikeLength) * Math.cos(rad);
    const tipY = centerY + (virusRadius + spikeLength) * Math.sin(rad);
    const tipLeftX = tipX + (spikeTipWidth / 2) * Math.cos(perpAngle);
    const tipLeftY = tipY + (spikeTipWidth / 2) * Math.sin(perpAngle);
    const tipRightX = tipX - (spikeTipWidth / 2) * Math.cos(perpAngle);
    const tipRightY = tipY - (spikeTipWidth / 2) * Math.sin(perpAngle);
    
    // Create club-shaped path
    return `M ${baseLeftX} ${baseLeftY} L ${midLeftX} ${midLeftY} L ${tipLeftX} ${tipLeftY} L ${tipRightX} ${tipRightY} L ${midRightX} ${midRightY} L ${baseRightX} ${baseRightY} Z`;
  };

  const spikes = Array.from({ length: spikeCount }, (_, i) => {
    const angle = (360 / spikeCount) * i;
    const rad = (angle * Math.PI) / 180;
    const tipX = centerX + (virusRadius + spikeLength) * Math.cos(rad);
    const tipY = centerY + (virusRadius + spikeLength) * Math.sin(rad);
    return { 
      angle, 
      path: generateSpikePath(angle),
      tipX,
      tipY
    };
  });

  // Generate speckles for the virus body
  const speckles = [
    { cx: 50, cy: 50, r: 2 },
    { cx: 70, cy: 55, r: 1.5 },
    { cx: 55, cy: 70, r: 2.5 },
    { cx: 65, cy: 45, r: 1.8 },
    { cx: 45, cy: 60, r: 2 },
    { cx: 75, cy: 65, r: 1.5 },
    { cx: 50, cy: 75, r: 2.2 },
    { cx: 68, cy: 50, r: 1.7 },
  ];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.orbContainer, animatedStyle]}>
        {/* Outer cyan glow */}
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]}>
          <LinearGradient
            colors={['rgba(0, 255, 255, 0.5)', 'rgba(75, 198, 255, 0.6)', 'rgba(0, 255, 255, 0.5)']}
            style={styles.glowGradient}
          />
        </Animated.View>
        
        {/* Virus SVG */}
        <Svg width={120} height={120} style={styles.virusSvg}>
          <Defs>
            {/* Blue/purple gradient for virus body */}
            <SvgLinearGradient id="virusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#4A00E0" stopOpacity="1" />
              <Stop offset="30%" stopColor="#6B46C1" stopOpacity="1" />
              <Stop offset="60%" stopColor="#027BFF" stopOpacity="1" />
              <Stop offset="100%" stopColor="#4A00E0" stopOpacity="1" />
            </SvgLinearGradient>
            {/* Light blue gradient for spikes */}
            <SvgLinearGradient id="spikeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#87CEEB" stopOpacity="1" />
              <Stop offset="100%" stopColor="#4BC6FF" stopOpacity="1" />
            </SvgLinearGradient>
            {/* Cyan glow filter */}
            <SvgLinearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#00FFFF" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#4BC6FF" stopOpacity="0.8" />
            </SvgLinearGradient>
          </Defs>
          
          {/* Spikes with pink/magenta tips */}
          {spikes.map((spike, index) => (
            <React.Fragment key={index}>
              {/* Spike body */}
              <Path
                d={spike.path}
                fill="url(#spikeGradient)"
                stroke="#4BC6FF"
                strokeWidth="1.5"
                opacity={1}
              />
              {/* Pink/magenta oval tip */}
              <Ellipse
                cx={spike.tipX}
                cy={spike.tipY}
                rx={spikeTipWidth / 2}
                ry={spikeTipHeight / 2}
                fill="#FF1493"
                opacity={0.9}
              />
            </React.Fragment>
          ))}
          
          {/* Central virus body with blue/purple gradient */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={virusRadius}
            fill="url(#virusGradient)"
            stroke="#1E40AF"
            strokeWidth="2"
            opacity={1}
          />
          
          {/* Speckles on virus body */}
          {speckles.map((speckle, index) => (
            <Circle
              key={index}
              cx={speckle.cx}
              cy={speckle.cy}
              r={speckle.r}
              fill="rgba(139, 69, 255, 0.6)"
              opacity={0.7}
            />
          ))}
          
          {/* Inner highlight circle */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={virusRadius * 0.65}
            fill="rgba(255, 255, 255, 0.1)"
          />
          
          {/* Core circle */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={virusRadius * 0.4}
            fill="rgba(255, 255, 255, 0.15)"
          />
          
          {/* Cyan glow outline */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={virusRadius + 2}
            fill="none"
            stroke="url(#glowGradient)"
            strokeWidth="3"
            opacity={0.6}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  orbContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  virusSvg: {
    shadowColor: '#4BC6FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
});

