import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { QRCodeGenerator } from './QRCodeGenerator';

interface QRCodeDisplayProps {
  strainId: string;
  onShare?: () => void;
}

export function QRCodeDisplay({ strainId, onShare }: QRCodeDisplayProps) {
  const shareableLink = `infekt://tag/${strainId}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Get infected! Scan my QR code or use this link: ${shareableLink}`,
        url: shareableLink,
      });
      onShare?.();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Infection QR Code</Text>
      <QRCodeGenerator value={shareableLink} size={200} />
      <Text style={styles.link}>{shareableLink}</Text>
      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareButtonText}>Share Link</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  link: {
    marginTop: 16,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  shareButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

