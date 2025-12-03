import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useStrain } from '../../hooks/useStrain';
import { useUserTags } from '../../hooks/useUserTags';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { VirusAnimatedLogo } from '../../components/VirusAnimatedLogo';
import { animatedHeaderContainer } from '../../theme/effects';
import { NeonButton } from '../../components/NeonButton';
import { GlassCard } from '../../components/GlassCard';
import { StatBlock } from '../../components/StatBlock';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { OutbreakList } from '../../components/OutbreakList';
import { CountryListModal } from '../../components/CountryListModal';
import { Ionicons } from '@expo/vector-icons';
import { TagBadge } from '../../components/TagBadge';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { strain, analytics, loading: strainLoading, refetch } = useStrain(
    user?.current_strain_id || null
  );
  const {
    tags: carriedTags,
    total: carriedTotal,
    loading: tagsLoading,
  } = useUserTags(user?.id || null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [countriesModalVisible, setCountriesModalVisible] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Placeholder data (will be replaced with real data later)
  const totalCases = analytics?.total_infections || 42;
  const countriesInfected = analytics?.countries_count || 3;
  const duration = '2 days';
  const status = totalCases > 0 ? 'Active' : 'Dormant';
  const evolutionPoints = 24;
  const spreadRate = '12.5%';
  const percentPerPlayer = '8.3%';
  const infectedCountries = analytics?.countries || [];
  const hasCountryDetails = infectedCountries.length > 0;

  if (authLoading || strainLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <ErrorMessage message="Please complete onboarding" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4BC6FF"
          />
        }
      >
      {/* Hero Header */}
      <View style={styles.heroSection}>
        {/* Animated Virus Logo */}
        <View style={[animatedHeaderContainer, styles.animatedLogoContainer]}>
          <VirusAnimatedLogo />
        </View>

        {/* Status Pill - positioned below logo */}
        <View style={styles.statusPillContainer}>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, status === 'Active' && styles.statusDotActive]} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        {/* Stat row under logo */}
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{totalCases}</Text>
            <Text style={styles.heroStatLabel}>Total Cases</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{countriesInfected}</Text>
            <Text style={styles.heroStatLabel}>Countries Infected</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{duration}</Text>
            <Text style={styles.heroStatLabel}>Duration</Text>
          </View>
        </View>
      </View>

      {/* Primary CTA */}
      <View style={styles.ctaSection}>
        <NeonButton
          title="Tag Player"
          onPress={() => router.push('/scan')}
          style={styles.tagButton}
        />
      </View>

      {/* Stats Grid (2x2) */}
      <View style={styles.statsGrid}>
        <View style={styles.statBlockWrapper}>
          <StatBlock value={totalCases} label="Total Cases" compact />
        </View>
        <View style={styles.statBlockWrapper}>
          <StatBlock value={percentPerPlayer} label="% per Player" compact />
        </View>
        <View style={styles.statBlockWrapper}>
          <StatBlock
            value={countriesInfected}
            label={hasCountryDetails ? 'Countries Infected' : 'Countries Affected'}
            compact
            onPress={hasCountryDetails ? () => setCountriesModalVisible(true) : undefined}
          />
        </View>
        <View style={styles.statBlockWrapper}>
          <StatBlock value={spreadRate} label="Spread Rate" compact />
        </View>
      </View>

      {/* Tags You Carry */}
      <View style={styles.tagsSection}>
        <View style={styles.tagsHeader}>
          <Text style={styles.sectionTitle}>TAGS YOU CARRY</Text>
          <Text style={styles.tagCountLabel}>
            {tagsLoading ? 'Loading...' : `${carriedTotal} tags`}
          </Text>
        </View>
        {carriedTags.length === 0 ? (
          <Text style={styles.emptyTagsText}>
            No tags yet. Infect someone to start carrying lineage.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsScroller}
          >
            {carriedTags.map((tag) => (
              <TagBadge key={tag.tag_id} tag={tag} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Evolution Points Section */}
      <View style={styles.evolutionSection}>
        <GlassCard style={styles.evolutionCard}>
          <View style={styles.evolutionHeader}>
            <View style={styles.evolutionIconContainer}>
              <View style={styles.evolutionIcon}>
                <Ionicons name="sparkles" size={20} color="#9D4EDD" />
              </View>
            </View>
            <Text style={styles.evolutionLabel}>EVOLUTION POINTS</Text>
            <Text style={styles.evolutionValue}>{evolutionPoints}</Text>
          </View>
          <View style={styles.evolutionBarContainer}>
            <ProgressBar
              progress={evolutionPoints / 100}
              useGradient={true}
              gradientColors={['#9D4EDD', '#C77DFF', '#9D4EDD']}
              backgroundColor="rgba(157, 78, 221, 0.2)"
              height={12}
            />
          </View>
        </GlassCard>
      </View>

      {/* Outbreak Section */}
      <View style={styles.outbreakSection}>
        <Text style={styles.sectionTitle}>ACTIVE OUTBREAKS</Text>
        <OutbreakList outbreaks={[]} />
      </View>
      </ScrollView>
      <CountryListModal
        visible={countriesModalVisible}
        countries={infectedCountries}
        onClose={() => setCountriesModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08121D',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: 24,
  },
  animatedLogoContainer: {
    paddingTop: 30,
    marginBottom: 16,
  },
  statusPillContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(75, 198, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(75, 198, 255, 0.3)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: '#4BC6FF',
    shadowColor: '#4BC6FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  heroStat: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ctaSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  tagButton: {
    width: '100%',
    maxWidth: 320,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    marginHorizontal: -6,
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagCountLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  tagsScroller: {
    paddingVertical: 4,
  },
  emptyTagsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  statBlockWrapper: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  evolutionSection: {
    marginBottom: 24,
  },
  evolutionCard: {
    padding: 20,
  },
  evolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  evolutionIconContainer: {
    marginRight: 12,
  },
  evolutionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(157, 78, 221, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.3)',
  },
  evolutionLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  evolutionValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#9D4EDD',
  },
  evolutionBarContainer: {
    marginTop: 4,
  },
  outbreakSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
});
