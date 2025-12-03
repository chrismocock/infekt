import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
}

export function QRCodeGenerator({ value, size = 200 }: QRCodeGeneratorProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <QRCode
        value={value}
        size={size - 32} // Account for padding
        color="#000"
        backgroundColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

