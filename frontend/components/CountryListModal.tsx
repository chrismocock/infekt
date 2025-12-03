import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from './GlassCard';

interface CountryListModalProps {
  visible: boolean;
  countries: string[];
  onClose: () => void;
}

export function CountryListModal({ visible, countries, onClose }: CountryListModalProps) {
  const hasCountries = countries.length > 0;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <GlassCard style={styles.modal} borderRadius={28}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <Text style={styles.title}>Countries Infected</Text>
              <Text style={styles.subtitle}>
                {hasCountries
                  ? `Tracking ${countries.length} ${
                      countries.length === 1 ? 'region' : 'regions'
                    }`
                  : 'No confirmed spread yet'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {hasCountries ? (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {countries.map((country) => (
                <View key={country} style={styles.countryItem}>
                  <View style={styles.countryDot} />
                  <Text style={styles.countryName}>{country}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="planet"
                size={32}
                color="rgba(255, 255, 255, 0.5)"
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>
                Spread to your first country to populate this list.
              </Text>
            </View>
          )}
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 10, 20, 0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleGroup: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  list: {
    maxHeight: 360,
  },
  listContent: {
    paddingBottom: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  countryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    backgroundColor: '#4BC6FF',
  },
  countryName: {
    fontSize: 15,
    color: '#FFFFFF',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
