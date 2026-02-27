import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { playersApi } from '@/api/players';
import { StatBox } from '@/components/ui/StatBox';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';

export default function PlayerProfileScreen() {
  const colors = useColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data: player, isLoading, refetch } = useQuery({
    queryKey: ['player', slug],
    queryFn: () => playersApi.getBySlug(slug),
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading || !player) {
    return <Loading message="Loading player..." />;
  }

  const heightDisplay = player.heightInches
    ? `${Math.floor(player.heightInches / 12)}'${player.heightInches % 12}"`
    : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.red} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: player.profileImageUrl ?? undefined }}
          style={[styles.avatar, { backgroundColor: colors.surfaceLight, borderColor: colors.red }]}
          contentFit="cover"
          transition={200}
        />
        <Text style={[styles.name, { color: colors.textPrimary }]}>{player.firstName} {player.lastName}</Text>
        <View style={styles.metaRow}>
          {player.position && (
            <View style={[styles.badge, { backgroundColor: colors.navy }]}>
              <Text style={[styles.badgeText, { color: colors.gold }]}>{player.position}</Text>
            </View>
          )}
          {player.graduationYear && (
            <View style={[styles.badge, { backgroundColor: colors.navy }]}>
              <Text style={[styles.badgeText, { color: colors.gold }]}>'{String(player.graduationYear).slice(2)}</Text>
            </View>
          )}
        </View>
        {player.school && <Text style={[styles.school, { color: colors.textSecondary }]}>{player.school}</Text>}
        {player.city && player.state && (
          <Text style={[styles.location, { color: colors.textMuted }]}>{player.city}, {player.state}</Text>
        )}
      </View>

      {/* Physical Info */}
      <View style={styles.statsRow}>
        {heightDisplay && <StatBox label="Height" value={heightDisplay} />}
        {player.weight && <StatBox label="Weight" value={`${player.weight}`} />}
        {player.gpa && <StatBox label="GPA" value={player.gpa.toFixed(1)} highlight />}
      </View>

      {/* Bio */}
      {player.bio && (
        <Card style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.gold }]}>ABOUT</Text>
          <Text style={[styles.bioText, { color: colors.textSecondary }]}>{player.bio}</Text>
        </Card>
      )}

      {/* Placeholder for stats - will be populated from API */}
      {/* Stats */}
      {player.careerStats && player.careerStats.gamesPlayed > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.gold }]}>SEASON STATS</Text>

          <View style={styles.statsGrid}>
            <StatBox label="PPG" value={player.careerStats.averages.ppg.toFixed(1)} highlight />
            <StatBox label="RPG" value={player.careerStats.averages.rpg.toFixed(1)} />
            <StatBox label="APG" value={player.careerStats.averages.apg.toFixed(1)} />
            <StatBox label="SPG" value={player.careerStats.averages.spg.toFixed(1)} />
            <StatBox label="BPG" value={player.careerStats.averages.bpg.toFixed(1)} />
          </View>

          <View style={[styles.shootingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.shootingItem}>
              <Text style={[styles.shootingValue, { color: colors.textPrimary }]}>
                {player.careerStats.shooting.fgPct.toFixed(1)}%
              </Text>
              <Text style={[styles.shootingLabel, { color: colors.textMuted }]}>FG</Text>
            </View>
            <View style={[styles.shootingDivider, { backgroundColor: colors.border }]} />
            <View style={styles.shootingItem}>
              <Text style={[styles.shootingValue, { color: colors.textPrimary }]}>
                {player.careerStats.shooting.fg3Pct.toFixed(1)}%
              </Text>
              <Text style={[styles.shootingLabel, { color: colors.textMuted }]}>3PT</Text>
            </View>
            <View style={[styles.shootingDivider, { backgroundColor: colors.border }]} />
            <View style={styles.shootingItem}>
              <Text style={[styles.shootingValue, { color: colors.textPrimary }]}>
                {player.careerStats.shooting.ftPct.toFixed(1)}%
              </Text>
              <Text style={[styles.shootingLabel, { color: colors.textMuted }]}>FT</Text>
            </View>
          </View>
        </View>
      ) : (
        <Card variant="navy" style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.gold }]}>SEASON STATS</Text>
          <Text style={[styles.comingSoon, { color: colors.textSecondary }]}>
            No stats available for this player yet.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: Spacing.lg,
    borderWidth: 3,
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  school: {
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
  },
  location: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  bioText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  comingSoon: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  shootingRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  shootingItem: {
    alignItems: 'center',
  },
  shootingValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  shootingLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
    fontWeight: '600',
  },
  shootingDivider: {
    width: 1,
    height: 24,
  },
});
