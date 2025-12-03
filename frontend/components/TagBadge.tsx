import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UserTag } from '../types/database';

interface TagBadgeProps {
  tag: UserTag;
  accentColor?: string;
  mode?: 'dark' | 'light';
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, accentColor = '#4BC6FF', mode = 'dark' }) => {
  const ownerName = tag.origin_user?.username || 'Unknown';
  const depth = tag.generation_depth ?? 0;
  const containerStyle = [
    styles.container,
    {
      borderColor: accentColor,
      shadowColor: accentColor,
      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(8,18,29,0.05)',
    },
  ];
  const ownerStyle = [styles.ownerText, mode === 'light' && styles.ownerTextLight];
  const metaStyle = [styles.metaText, mode === 'light' && styles.metaTextLight];

  return (
    <View style={containerStyle}>
      <Text style={ownerStyle}>@{ownerName}</Text>
      <Text style={metaStyle}>Depth {depth}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  ownerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ownerTextLight: {
    color: '#08121D',
  },
  metaText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  metaTextLight: {
    color: 'rgba(8,18,29,0.6)',
  },
});
