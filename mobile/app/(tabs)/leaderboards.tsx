import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { leaderboardsApi } from '@/api/leaderboards';
import { Loading } from '@/components/ui/Loading';
import type { LeaderboardEntry } from '@/types';

type StatCategory = 'ppg' | 'rpg' | 'apg' | 'spg' | 'bpg' | 'fgPct';

const categories: { key: StatCategory; label: string; format: (v: number) => string }[] = [
  { key: 'ppg', label: 'Points', format: v => v.toFixed(1) },
  { key: 'rpg', label: 'Rebounds', format: v => v.toFixed(1) },
  { key: 'apg', label: 'Assists', format: v => v.toFixed(1) },
  { key: 'spg', label: 'Steals', format: v => v.toFixed(1) },
  { key: 'bpg', label: 'Blocks', format: v => v.toFixed(1) },
  { key: 'fgPct', label: 'FG%', format: v => `${(v * 100).toFixed(1)}%` },
];

export default function LeaderboardsScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<StatCategory>('ppg');

  const { data: leaders, isLoading, refetch } = useQuery({
    queryKey: ['leaderboards', category],
    queryFn: () => leaderboardsApi.get({ stat: category }),
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const currentCategory = categories.find(c => c.key === category)!;

  if (isLoading) {
    return <Loading message="Loading leaderboards..." />;
  }

  const renderLeader = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

    return (
      <TouchableOpacity
        style={[styles.leaderRow, isTop3 && styles.leaderRowTop]}
        onPress={() => router.push(`/players/${item.player.slug}`)}
        activeOpacity={0.7}
      >
        <View style={[styles.rankBadge, isTop3 && { backgroundColor: rankColors[rank - 1] }]}>
          <Text style={[styles.rankText, isTop3 && styles.rankTextTop]}>{rank}</Text>
        </View>

        <Image
          source={{ uri: item.player.profileImageUrl ?? undefined }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.playerInfo}>
          <Text style={styles.playerName} numberOfLines={1}>
            {item.player.firstName} {item.player.lastName}
          </Text>
          <Text style={styles.playerMeta}>
            {[item.player.position, item.player.graduationYear ? `'${String(item.player.graduationYear).slice(2)}` : null]
              .filter(Boolean)
              .join(' | ')}
          </Text>
        </View>

        <View style={styles.statValue}>
          <Text style={[styles.statNumber, isTop3 && styles.statNumberTop]}>
            {currentCategory.format(item.value)}
          </Text>
          <Text style={styles.statLabel}>{currentCategory.label.toUpperCase()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Category pills */}
      <FlatList
        horizontal
        data={categories}
        keyExtractor={item => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.pill, category === item.key && styles.pillActive]}
            onPress={() => setCategory(item.key)}
          >
            <Text style={[styles.pillText, category === item.key && styles.pillTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.pillBar}
        showsHorizontalScrollIndicator={false}
      />

      {/* Leaders list */}
      <FlatList
        data={leaders}
        keyExtractor={(item: LeaderboardEntry) => `${item.player.id}-${item.statKey}`}
        renderItem={renderLeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No leaderboard data available</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pillBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.red,
    borderColor: Colors.red,
  },
  pillText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.textPrimary,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  leaderRowTop: {
    borderBottomColor: Colors.borderLight,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  rankTextTop: {
    color: Colors.background,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceLight,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  playerMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  statValue: {
    alignItems: 'flex-end',
  },
  statNumber: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  statNumberTop: {
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
});
