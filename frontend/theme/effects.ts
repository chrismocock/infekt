import { StyleSheet, ViewStyle } from 'react-native';

export const glowEffect: ViewStyle = {
  shadowColor: '#00CFFF',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 20,
  elevation: 10,
};

export const animatedHeaderContainer: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 30,
};

export const styles = StyleSheet.create({
  glowEffect,
  animatedHeaderContainer,
});

