// Infect Tab - Unified Infection Actions Screen

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { InfectionActions } from '../../components/infection/InfectionActions';
import { useRouter } from 'expo-router';
import { useStrain } from '../../hooks/useStrain';
import { useAuth } from '../../hooks/useAuth';

export default function InfectScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refetch } = useStrain(user?.current_strain_id || null);

  const handleInfectionSuccess = () => {
    // Refresh strain data after successful infection
    refetch();
    // Optionally navigate back or show success message
  };

  return (
    <View style={styles.container}>
      <InfectionActions onInfectionSuccess={handleInfectionSuccess} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

