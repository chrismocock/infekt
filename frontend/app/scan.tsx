import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { QRCodeScanner } from '../components/qr/QRCodeScanner';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { tagUser, TagPropagationSummary, infectQR } from '../lib/api';
import { supabase } from '../lib/supabase';
import { TagBadge } from '../components/TagBadge';

export default function ScanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { location, getCurrentLocation } = useLocation();
  const [scanMode, setScanMode] = useState<'qr' | 'link' | 'gps'>('qr');
  const [targetStrainId, setTargetStrainId] = useState('');
  const [gpsProximity, setGpsProximity] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [summary, setSummary] = useState<TagPropagationSummary | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);

  const handleQRScan = async (data: string) => {
    if (!user || !location) {
      Alert.alert('Error', 'User or location not available.');
      return;
    }

    try {
      // Extract strain ID or link code from QR code data
      let qrToken: string | null = null;
      
      // Try infekt://tag/{strainId} format
      const tagMatch = data.match(/tag\/([a-f0-9-]+)/i);
      if (tagMatch) {
        qrToken = tagMatch[1];
      } else {
        // Try infekt://i/{code} format
        const linkMatch = data.match(/i\/([a-zA-Z0-9]+)/i);
        if (linkMatch) {
          qrToken = linkMatch[1];
        } else {
          // Try direct strain ID
          const uuidMatch = data.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
          if (uuidMatch) {
            qrToken = uuidMatch[0];
          }
        }
      }

      if (!qrToken) {
        Alert.alert('Invalid QR Code', 'The scanned QR code is not valid.');
        return;
      }

      setTagging(true);
      const response = await infectQR(qrToken, user.id, location);
      setSummary(response.propagation);
      setSummaryVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process QR code.');
    } finally {
      setTagging(false);
    }
  };

  const handleCloseSummary = () => {
    setSummaryVisible(false);
    setSummary(null);
    router.back();
  };

  const summaryModal = (
    <Modal
      visible={summaryVisible && !!summary}
      transparent
      animationType="slide"
      onRequestClose={handleCloseSummary}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Infection Summary</Text>
          <Text style={styles.modalHeadline}>
            You transmitted {summary?.transmitted || 0} tags
          </Text>
          <Text style={styles.modalSubHeadline}>
            Target now holds {summary?.final_tag_count || 0} tags
          </Text>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Tags Passed</Text>
            {summary?.new_tags && summary.new_tags.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modalBadges}
              >
                {summary.new_tags.map((tag) => (
                  <TagBadge
                    key={tag.tag_id}
                    tag={{
                      tag_id: tag.tag_id,
                      acquired_at: new Date().toISOString(),
                      generation_depth: tag.generation_depth,
                      origin_user_id: tag.origin_user_id,
                      origin_user: {
                        id: tag.origin_user_id,
                        username: tag.origin_username,
                      },
                    }}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.modalEmptyText}>No new tags applied.</Text>
            )}
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Score Summary</Text>
            {summary?.score_summary && summary.score_summary.length > 0 ? (
              summary.score_summary.map((entry) => (
                <View key={entry.origin_user_id} style={styles.scoreRow}>
                  <Text style={styles.scoreUser}>
                    @{entry.username || 'Unknown'}
                  </Text>
                  <Text style={styles.scoreValue}>+{entry.direct_increment} direct</Text>
                  <Text style={styles.scoreValue}>
                    +{entry.indirect_increment.toFixed(2)} indirect
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.modalEmptyText}>No score changes recorded.</Text>
            )}
          </View>

          <Button title="Done" onPress={handleCloseSummary} />
        </View>
      </View>
    </Modal>
  );

  const handleTag = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to tag someone.');
      return;
    }

    if (!targetStrainId) {
      Alert.alert('Error', 'Please scan a QR code or enter a strain ID.');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Location is required for tagging.');
      await getCurrentLocation();
      return;
    }

    try {
      setTagging(true);

      // Get target user by strain ID
      const { data: targetStrain, error: strainError } = await supabase
        .from('strains')
        .select('origin_user_id')
        .eq('id', targetStrainId)
        .single();

      if (strainError || !targetStrain) {
        Alert.alert('Error', 'Strain not found.');
        return;
      }

      const targetUserId = targetStrain.origin_user_id;

      // Tag the user
      const response = await tagUser(
        user.id,
        targetUserId,
        location,
        user.current_variant_id || undefined
      );
      setSummary(response.propagation);
      setSummaryVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to tag user.');
    } finally {
      setTagging(false);
    }
  };

  if (scanMode === 'qr') {
    return (
      <View style={styles.container}>
        <QRCodeScanner
          onScan={handleQRScan}
          onCancel={() => router.back()}
        />
        {summaryModal}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tag Someone</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Strain ID or Link</Text>
        <TextInput
          style={styles.input}
          placeholder="infekt://tag/..."
          value={targetStrainId}
          onChangeText={setTargetStrainId}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>GPS Proximity Mode</Text>
          <Switch
            value={gpsProximity}
            onValueChange={setGpsProximity}
          />
        </View>
        <Text style={styles.hint}>
          {gpsProximity
            ? 'Tagging will only work when you are near the target'
            : 'Tagging works from any distance'}
        </Text>
      </View>

      {location && (
        <View style={styles.section}>
          <Text style={styles.label}>Your Location</Text>
          <Text style={styles.locationText}>
            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </Text>
        </View>
      )}

      <Button
        title={tagging ? 'Tagging...' : 'Tag User'}
        onPress={handleTag}
        loading={tagging}
        disabled={!targetStrainId || !location}
        style={styles.button}
      />

      <Button
        title="Scan QR Code"
        onPress={() => setScanMode('qr')}
        variant="outline"
        style={styles.button}
      />
      {summaryModal}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  button: {
    marginBottom: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#08121D',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalHeadline: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSubHeadline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalBadges: {
    paddingVertical: 4,
  },
  modalEmptyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  scoreUser: {
    fontSize: 12,
    color: '#FFFFFF',
    flex: 1,
  },
  scoreValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 8,
  },
});

