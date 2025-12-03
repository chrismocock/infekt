import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { QRCodeDisplay } from '../../components/qr/QRCodeDisplay';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, loading: authLoading, createAnonymousUser } = useAuth();
  const { requestPermission, permissionGranted } = useLocation();
  const [username, setUsername] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateAccount = async () => {
    try {
      setCreating(true);
      const newUser = await createAnonymousUser(username || undefined);
      
      // Request location permission
      await requestPermission();
      
      Alert.alert(
        'Welcome to Infekt!',
        'Your account has been created. Start tagging others to spread your strain!',
        [
          {
            text: 'Get Started',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || creating) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Creating your account..." />
      </View>
    );
  }

  if (user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Welcome to Infekt!</Text>
        <Text style={styles.subtitle}>
          Your strain is ready. Share your QR code to infect others!
        </Text>
        
        {user.current_strain_id && (
          <QRCodeDisplay strainId={user.current_strain_id} />
        )}

        <Button
          title="Continue to App"
          onPress={() => router.replace('/(tabs)')}
          style={styles.button}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome to Infekt</Text>
      <Text style={styles.subtitle}>
        A viral tagging game where you infect others and spread your strain
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Username (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter a username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Button
          title="Create Account"
          onPress={handleCreateAccount}
          loading={creating}
          style={styles.button}
        />
      </View>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
    maxWidth: 400,
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
    marginBottom: 20,
  },
  button: {
    width: '100%',
  },
});

