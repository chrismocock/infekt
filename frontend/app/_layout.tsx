import { Stack } from 'expo-router';
import { ErrorBoundary } from 'react-error-boundary';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useDeepLinking } from '../hooks/useDeepLinking';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>⚠️ Error</Text>
        <Text style={styles.error}>{error?.message || 'Unknown error'}</Text>
        {error?.stack && (
          <Text style={styles.stack}>{error.stack}</Text>
        )}
        <TouchableOpacity style={styles.button} onPress={resetErrorBoundary}>
          <Text style={styles.buttonText}>Tap to Retry</Text>
        </TouchableOpacity>
        <Text style={styles.help}>
          Check your terminal for more details.{'\n'}
          Make sure .env file has Supabase credentials.
        </Text>
      </ScrollView>
    </View>
  );
}

export default function RootLayout() {
  // Initialize deep linking
  useDeepLinking();

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="profile" />
      </Stack>
    </ErrorBoundary>
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
    color: '#FF3B30',
    marginBottom: 16,
  },
  error: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
    fontWeight: '600',
  },
  stack: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginTop: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  help: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});
