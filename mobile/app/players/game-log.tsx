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
import { Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { playersApi } from '@/api/players';
import { Loading } from '@/components/ui/Loading';
import type { PlayerGameStats } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GameLogScreen() {
  const colors = useColors();
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
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: Fonts.heading, fontSize: 18 },
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.red} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{playerName ?? `${player.firstName} ${player.lastName}`}</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {gameStats.length} Game{gameStats.length !== 1 ? 's' : ''} Played
          </Text>
        </View>

        {/* Column Headers */}
        {gameStats.length > 0 && (
          <View style={[styles.columnHeaders, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.gameInfoCol}>
              <Text style={[styles.colHeaderText, { color: colors.textMuted }]}>OPPONENT</Text>
            </View>
            <Text style={[styles.colHeaderText, styles.statCol, { color: colors.textMuted }]}>PTS</Text>
            <Text style={[styles.colHeaderText, styles.statCol, { color: colors.textMuted }]}>REB</Text>
            <Text style={[styles.colHeaderText, styles.statCol, { color: colors.textMuted }]}>AST</Text>
            <Text style={[styles.colHeaderText, styles.statCol, { color: colors.textMuted }]}>STL</Text>
            <Text style={[styles.colHeaderText, styles.statCol, { color: colors.textMuted }]}>BLK</Text>
            <Text style={[styles.colHeaderText, styles.statCol, { color: colors.textMuted }]}>TO</Text>
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
                style={[styles.gameRow, { borderBottomColor: colors.border }, i % 2 === 0 && { backgroundColor: colors.alternateRow }]}
              >
                <View style={styles.gameInfoCol}>
                  <Text style={[styles.opponentName, { color: colors.textPrimary }]} numberOfLines={1}>
                    vs {opponentName}
                  </Text>
                  <View style={styles.gameMeta}>
                    {dateStr ? <Text style={[styles.gameDate, { color: colors.textMuted }]}>{dateStr}</Text> : null}
                    {scoreStr ? (
                      <Text style={[styles.gameScore, { color: colors.textSecondary }]}>{scoreStr}</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={[styles.statValue, styles.statCol, { color: colors.textSecondary }, gs.points >= 20 && { color: colors.gold, fontFamily: Fonts.headingBlack }]}>
                  {gs.points}
                </Text>
                <Text style={[styles.statValue, styles.statCol, { color: colors.textSecondary }, gs.rebounds >= 10 && { color: colors.gold, fontFamily: Fonts.headingBlack }]}>
                  {gs.rebounds}
                </Text>
                <Text style={[styles.statValue, styles.statCol, { color: colors.textSecondary }, gs.assists >= 10 && { color: colors.gold, fontFamily: Fonts.headingBlack }]}>
                  {gs.assists}
                </Text>
                <Text style={[styles.statValue, styles.statCol, { color: colors.textSecondary }]}>{gs.steals}</Text>
                <Text style={[styles.statValue, styles.statCol, { color: colors.textSecondary }]}>{gs.blocks}</Text>
                <Text style={[styles.statValue, styles.statCol, { color: colors.textSecondary }]}>{gs.turnovers}</Text>
              </View>
            );
          })
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Games Yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Game stats will appear here once games have been recorded.
            </Text>
          </View>
        )}

        {/* Shooting Splits (if games exist) */}
        {gameStats.length > 0 && (
          <View style={styles.shootingSection}>
            <Text style={[styles.shootingSectionTitle, { color: colors.textMuted }]}>SHOOTING DETAIL</Text>
            <View style={[styles.shootingHeaders, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.gameInfoCol}>
                <Text style={[styles.colHeaderText, { color: colors.textMuted }]}>DATE</Text>
              </View>
              <Text style={[styles.colHeaderText, styles.shootCol, { color: colors.textMuted }]}>FG</Text>
              <Text style={[styles.colHeaderText, styles.shootCol, { color: colors.textMuted }]}>3PT</Text>
              <Text style={[styles.colHeaderText, styles.shootCol, { color: colors.textMuted }]}>FT</Text>
              <Text style={[styles.colHeaderText, styles.shootCol, { color: colors.textMuted }]}>MIN</Text>
              <Text style={[styles.colHeaderText, styles.shootCol, { color: colors.textMuted }]}>FLS</Text>
            </View>
            {gameStats.map((gs, i) => {
              const dateStr = gs.game.scheduledAt
                ? format(new Date(gs.game.scheduledAt), 'M/d')
                : '\u2014';
              return (
                <View
                  key={`shoot-${gs.id}`}
                  style={[styles.gameRow, { borderBottomColor: colors.border }, i % 2 === 0 && { backgroundColor: colors.alternateRow }]}
                >
                  <View style={styles.gameInfoCol}>
                    <Text style={[styles.gameDate, { color: colors.textMuted }]}>{dateStr}</Text>
                  </View>
                  <Text style={[styles.statValue, styles.shootCol, { color: colors.textSecondary }]}>
                    {gs.fgMade}/{gs.fgAttempted}
                  </Text>
                  <Text style={[styles.statValue, styles.shootCol, { color: colors.textSecondary }]}>
                    {gs.fg3Made}/{gs.fg3Attempted}
                  </Text>
                  <Text style={[styles.statValue, styles.shootCol, { color: colors.textSecondary }]}>
                    {gs.ftMade}/{gs.ftAttempted}
                  </Text>
                  <Text style={[styles.statValue, styles.shootCol, { color: colors.textSecondary }]}>{gs.minutes}</Text>
                  <Text style={[styles.statValue, styles.shootCol, { color: colors.textSecondary }]}>{gs.fouls}</Text>
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
  },
  headerSub: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
    marginTop: 4,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  colHeaderText: {
    fontSize: 10,
    fontFamily: Fonts.headingBlack,
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
  },
  opponentName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },
  gameMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  gameDate: {
    fontSize: 10,
    fontFamily: Fonts.body,
  },
  gameScore: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },
  emptyState: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    textAlign: 'center',
  },
  shootingSection: {
    marginTop: Spacing.xxl,
  },
  shootingSectionTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingBlack,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  shootingHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
});
