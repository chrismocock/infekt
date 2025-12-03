import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { View, StyleSheet, Text } from 'react-native';

export default function Index() {
  const { user, loading, error } = useAuth();

  // Log for debugging
  if (__DEV__) {
    console.log('Index: loading=', loading, 'user=', user?.id, 'error=', error?.message);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error) {
    console.error('Auth error:', error);
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Error: {error.message}</Text>
        <Text style={styles.help}>Check terminal for details</Text>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    color: '#FF3B30',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  help: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

