import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ViewStyle,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Variant } from '../../types/database';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

export default function VariantsScreen() {
  const { user } = useAuth();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [userVariants, setUserVariants] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadVariants();
    loadUserVariants();
  }, [user]);

  const loadVariants = async () => {
    try {
      const { data, error: err } = await supabase
        .from('variants')
        .select('*')
        .order('rarity', { ascending: true });

      if (err) throw err;
      setVariants(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserVariants = async () => {
    if (!user) return;

    try {
      const { data, error: err } = await supabase
        .from('user_variants')
        .select('variant_id')
        .eq('user_id', user.id);

      if (err) throw err;
      setUserVariants((data || []).map((uv) => uv.variant_id));
    } catch (err) {
      console.error('Error loading user variants:', err);
    }
  };

  const handleSelectVariant = async (variant: Variant) => {
    if (!user) return;

    if (!userVariants.includes(variant.id)) {
      Alert.alert('Variant Locked', 'You need to unlock this variant first.');
      return;
    }

    try {
      const { error: err } = await supabase
        .from('users')
        .update({ current_variant_id: variant.id })
        .eq('id', user.id);

      if (err) throw err;
      Alert.alert('Success', 'Variant activated!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const renderVariant = ({ item }: { item: Variant }) => {
    const isUnlocked = userVariants.includes(item.id);
    const isActive = user?.current_variant_id === item.id;

    const cardStyles: ViewStyle[] = [styles.variantCard];
    if (!isUnlocked) cardStyles.push(styles.lockedCard);
    if (isActive) cardStyles.push(styles.activeCard);

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedVariant(item);
          setModalVisible(true);
        }}
      >
        <Card
          style={cardStyles}
        >
          <View style={styles.variantHeader}>
            <Text style={styles.variantName}>{item.name}</Text>
            {isActive && <Badge label="Active" variant="success" />}
            {!isUnlocked && <Badge label="Locked" variant="default" />}
          </View>
          <Text style={styles.variantRarity}>Rarity: {item.rarity}</Text>
          {isUnlocked && (
            <Button
              title="Activate"
              onPress={() => handleSelectVariant(item)}
              variant="outline"
              style={styles.activateButton}
            />
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error.message} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={variants}
        renderItem={renderVariant}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedVariant && (
              <>
                <Text style={styles.modalTitle}>{selectedVariant.name}</Text>
                <Text style={styles.modalText}>
                  Radius: {selectedVariant.rules.radius}m
                </Text>
                <Text style={styles.modalText}>
                  Tag Limit:{' '}
                  {selectedVariant.rules.tag_limit || 'Unlimited'}
                </Text>
                <Text style={styles.modalText}>
                  Visibility:{' '}
                  {selectedVariant.rules.visibility ? 'Visible' : 'Hidden'}
                </Text>
                {selectedVariant.rules.time_restriction && (
                  <Text style={styles.modalText}>
                    Time: {selectedVariant.rules.time_restriction.start} -{' '}
                    {selectedVariant.rules.time_restriction.end}
                  </Text>
                )}
                <Button
                  title="Close"
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  list: {
    padding: 16,
  },
  variantCard: {
    marginBottom: 12,
  },
  lockedCard: {
    opacity: 0.6,
  },
  activeCard: {
    borderWidth: 2,
    borderColor: '#34C759',
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  variantName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  variantRarity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  activateButton: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 24,
  },
});

