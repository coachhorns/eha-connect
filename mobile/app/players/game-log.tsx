import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { playersApi } from '@/api/players';
import { Loading } from '@/components/ui/Loading';
import type { PlayerGameStats } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GameLogScreen() {
  const { slug, playerName } = useLocalSearchParams<{ slug: string; playerName: string }>();

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
    return <Loading message="Loading game log..." />;
  }

  const gameStats: PlayerGameStats[] = player.gameStats ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Game Log',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontFamily: Fonts.heading, fontSize: 18 },
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{playerName ?? `${player.firstName} ${player.lastName}`}</Text>
          <Text style={styles.headerSub}>
            {gameStats.length} Game{gameStats.length !== 1 ? 's' : ''} Played
          </Text>
        </View>

        {/* Column Headers */}
        {gameStats.length > 0 && (
          <View style={styles.columnHeaders}>
            <View style={styles.gameInfoCol}>
              <Text style={styles.colHeaderText}>OPPONENT</Text>
            </View>
            <Text style={[styles.colHeaderText, styles.statCol]}>PTS</Text>
            <Text style={[styles.colHeaderText, styles.statCol]}>REB</Text>
            <Text style={[styles.colHeaderText, styles.statCol]}>AST</Text>
            <Text style={[styles.colHeaderText, styles.statCol]}>STL</Text>
            <Text style={[styles.colHeaderText, styles.statCol]}>BLK</Text>
            <Text style={[styles.colHeaderText, styles.statCol]}>TO</Text>
          </View>
        )}

        {/* Game Rows */}
        {gameStats.length > 0 ? (
          gameStats.map((gs, i) => {
            const game = gs.game;
            const isHome = gs.teamId === game.homeTeam?.slug || game.homeTeam !== null;
            // Determine opponent
            const opponent = gs.teamId
              ? (game.homeTeam?.name === game.awayTeam?.name
                  ? game.homeTeam?.name
                  : game.homeTeam && game.awayTeam
                    ? `${game.homeTeam.name} vs ${game.awayTeam.name}`
                    : game.homeTeam?.name ?? game.awayTeam?.name ?? 'Unknown')
              : 'Unknown';

            // Simple opponent display: show the other team
            const playerTeamIsHome = gs.teamId !== undefined;
            const opponentName = game.awayTeam?.name ?? game.homeTeam?.name ?? 'TBD';

            const dateStr = game.scheduledAt
              ? format(new Date(game.scheduledAt), 'MMM d')
              : '';

            const scoreStr = game.status === 'FINAL'
              ? `${game.homeScore}-${game.awayScore}`
              : '';

            return (
              <View
                key={gs.id}
                style={[styles.gameRow, i % 2 === 0 && styles.gameRowAlt]}
              >
                <View style={styles.gameInfoCol}>
                  <Text style={styles.opponentName} numberOfLines={1}>
                    vs {opponentName}
                  </Text>
                  <View style={styles.gameMeta}>
                    {dateStr ? <Text style={styles.gameDate}>{dateStr}</Text> : null}
                    {scoreStr ? (
                      <Text style={styles.gameScore}>{scoreStr}</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={[styles.statValue, styles.statCol, gs.points >= 20 && styles.statHighlight]}>
                  {gs.points}
                </Text>
                <Text style={[styles.statValue, styles.statCol, gs.rebounds >= 10 && styles.statHighlight]}>
                  {gs.rebounds}
                </Text>
                <Text style={[styles.statValue, styles.statCol, gs.assists >= 10 && styles.statHighlight]}>
                  {gs.assists}
                </Text>
                <Text style={[styles.statValue, styles.statCol]}>{gs.steals}</Text>
                <Text style={[styles.statValue, styles.statCol]}>{gs.blocks}</Text>
                <Text style={[styles.statValue, styles.statCol]}>{gs.turnovers}</Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Games Yet</Text>
            <Text style={styles.emptyDesc}>
              Game stats will appear here once games have been recorded.
            </Text>
          </View>
        )}

        {/* Shooting Splits (if games exist) */}
        {gameStats.length > 0 && (
          <View style={styles.shootingSection}>
            <Text style={styles.shootingSectionTitle}>SHOOTING DETAIL</Text>
            <View style={styles.shootingHeaders}>
              <View style={styles.gameInfoCol}>
                <Text style={styles.colHeaderText}>DATE</Text>
              </View>
              <Text style={[styles.colHeaderText, styles.shootCol]}>FG</Text>
              <Text style={[styles.colHeaderText, styles.shootCol]}>3PT</Text>
              <Text style={[styles.colHeaderText, styles.shootCol]}>FT</Text>
              <Text style={[styles.colHeaderText, styles.shootCol]}>MIN</Text>
              <Text style={[styles.colHeaderText, styles.shootCol]}>FLS</Text>
            </View>
            {gameStats.map((gs, i) => {
              const dateStr = gs.game.scheduledAt
                ? format(new Date(gs.game.scheduledAt), 'M/d')
                : '—';
              return (
                <View
                  key={`shoot-${gs.id}`}
                  style={[styles.gameRow, i % 2 === 0 && styles.gameRowAlt]}
                >
                  <View style={styles.gameInfoCol}>
                    <Text style={styles.gameDate}>{dateStr}</Text>
                  </View>
                  <Text style={[styles.statValue, styles.shootCol]}>
                    {gs.fgMade}/{gs.fgAttempted}
                  </Text>
                  <Text style={[styles.statValue, styles.shootCol]}>
                    {gs.fg3Made}/{gs.fg3Attempted}
                  </Text>
                  <Text style={[styles.statValue, styles.shootCol]}>
                    {gs.ftMade}/{gs.ftAttempted}
                  </Text>
                  <Text style={[styles.statValue, styles.shootCol]}>{gs.minutes}</Text>
                  <Text style={[styles.statValue, styles.shootCol]}>{gs.fouls}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontFamily: Fonts.headingBlack,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textMuted,
    marginTop: 4,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  colHeaderText: {
    fontSize: 10,
    fontFamily: Fonts.headingBlack,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  gameInfoCol: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  statCol: {
    width: 36,
    textAlign: 'center',
  },
  shootCol: {
    width: 44,
    textAlign: 'center',
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  gameRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  opponentName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  gameMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  gameDate: {
    fontSize: 10,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  gameScore: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecondary,
  },
  statHighlight: {
    color: Colors.gold,
    fontFamily: Fonts.headingBlack,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  shootingSection: {
    marginTop: Spacing.xxl,
  },
  shootingSectionTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingBlack,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  shootingHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
});
