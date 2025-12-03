import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useUserTags } from '../hooks/useUserTags';
import { useTestMode } from '../hooks/useTestMode';
import { QRCodeDisplay } from '../components/qr/QRCodeDisplay';
import { StatsCard } from '../components/ui/StatsCard';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { supabase } from '../lib/supabase';
import { TagBadge } from '../components/TagBadge';
import { Switch } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const {
    tags: carriedTags,
    total: carriedTotal,
    loading: tagsLoading,
    refetch: refetchTags,
  } = useUserTags(user?.id || null);
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const { isTestModeEnabled, toggleTestMode } = useTestMode();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/onboarding');
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    } else {
      setUsername('');
    }
  }, [user?.username]);

  const handleSaveUsername = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('users')
        .update({ username: username.trim() || null })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      await refreshUser();
      Alert.alert('Success', 'Username updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update username.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Please log in</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.username}>
          {user.username || 'Anonymous User'}
        </Text>
        <Text style={styles.userId}>
          User ID: {user.id}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter a username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <Button
          title={saving ? 'Saving...' : 'Save Username'}
          onPress={handleSaveUsername}
          loading={saving}
          style={styles.button}
        />
      </View>

      {user.current_strain_id && (
        <View style={styles.section}>
          <QRCodeDisplay strainId={user.current_strain_id} />
        </View>
      )}

      <View style={styles.statsGrid}>
        <StatsCard title="Tags Given" value={user.tags_given || 0} />
        <StatsCard title="Tags Received" value={user.tags_received || 0} />
        <StatsCard title="Generation" value={user.generation || 0} />
      </View>

      <View style={styles.section}>
        <View style={styles.tagsHeader}>
          <Text style={styles.sectionTitle}>Tags You Carry</Text>
          <Text style={styles.tagCount}>
            {tagsLoading ? 'Loading...' : `${carriedTotal} tags`}
          </Text>
        </View>
        {carriedTags.length === 0 ? (
          <Text style={styles.tagsEmpty}>No tags yet. Start infecting to collect lineage.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsScroller}
          >
            {carriedTags.map((tag) => (
              <TagBadge key={tag.tag_id} tag={tag} mode="light" />
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.testModeContainer}>
          <View style={styles.testModeContent}>
            <Text style={styles.testModeLabel}>Test Mode</Text>
            <Text style={styles.testModeDescription}>
              Unlocks all variants and enables map-based location selection for tag drops
            </Text>
          </View>
          <Switch
            value={isTestModeEnabled}
            onValueChange={toggleTestMode}
            trackColor={{ false: '#767577', true: '#00ff88' }}
            thumbColor={isTestModeEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
        {isTestModeEnabled && (
          <View style={styles.testModeIndicator}>
            <Text style={styles.testModeIndicatorText}>⚠️ Test Mode Active</Text>
          </View>
        )}
        <Button
          title="Notifications"
          onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon.')}
          variant="outline"
          style={styles.button}
        />
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="secondary"
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  username: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  userId: {
    fontSize: 12,
    color: '#999',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  button: {
    marginBottom: 12,
  },
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagCount: {
    fontSize: 12,
    color: '#555',
  },
  tagsEmpty: {
    fontSize: 12,
    color: '#777',
  },
  tagsScroller: {
    paddingVertical: 4,
  },
  testModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 12,
  },
  testModeContent: {
    flex: 1,
    marginRight: 12,
  },
  testModeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  testModeDescription: {
    fontSize: 12,
    color: '#666',
  },
  testModeIndicator: {
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
    marginBottom: 12,
  },
  testModeIndicatorText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center',
  },
});

