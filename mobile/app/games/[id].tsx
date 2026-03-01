import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { eventsApi } from '@/api/events';
import { Loading } from '@/components/ui/Loading';
import type { GameDetail, BoxScorePlayer } from '@/types';

const STAT_COLUMNS = [
  { key: 'minutes', label: 'MIN', width: 40 },
  { key: 'points', label: 'PTS', width: 40 },
  { key: 'rebounds', label: 'REB', width: 40 },
  { key: 'assists', label: 'AST', width: 40 },
  { key: 'steals', label: 'STL', width: 40 },
  { key: 'blocks', label: 'BLK', width: 40 },
  { key: 'turnovers', label: 'TO', width: 36 },
  { key: 'fouls', label: 'PF', width: 36 },
  { key: 'fg', label: 'FG', width: 52 },
  { key: '3pt', label: '3PT', width: 52 },
  { key: 'ft', label: 'FT', width: 52 },
] as const;

function getStatValue(player: BoxScorePlayer, key: string): string {
  switch (key) {
    case 'fg': return `${player.fgMade}-${player.fgAttempted}`;
    case '3pt': return `${player.fg3Made}-${player.fg3Attempted}`;
    case 'ft': return `${player.ftMade}-${player.ftAttempted}`;
    default: return String((player as any)[key] ?? 0);
  }
}

function getPercentage(made: number, attempted: number): string {
  if (attempted === 0) return '0%';
  return `${Math.round((made / attempted) * 100)}%`;
}

export default function GameDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedTeam, setSelectedTeam] = useState<'away' | 'home'>('away');
  const [refreshing, setRefreshing] = useState(false);

  const { data: game, isLoading, refetch } = useQuery({
    queryKey: ['gameDetail', id],
    queryFn: () => eventsApi.getGameDetail(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const g = query.state.data;
      if (!g) return false;
      return g.status === 'IN_PROGRESS' || g.status === 'HALFTIME' ? 5000 : false;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading || !game) {
    return <Loading message="Loading game..." />;
  }

  const isLive = game.status === 'IN_PROGRESS' || game.status === 'HALFTIME';
  const isFinal = game.status === 'FINAL';
  const isHomeWinner = isFinal && game.homeScore > game.awayScore;
  const isAwayWinner = isFinal && game.awayScore > game.homeScore;

  const stats = selectedTeam === 'away' ? game.awayStats : game.homeStats;
  const totals = selectedTeam === 'away' ? game.awayTotals : game.homeTotals;
  const hasStats = game.homeStats.length > 0 || game.awayStats.length > 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.red} />
      }
    >
      {/* Status */}
      <View style={styles.statusContainer}>
        {isLive ? (
          <View style={styles.liveBadge}>
            <View style={[styles.liveDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.liveText, { color: colors.error }]}>
              {game.status === 'HALFTIME' ? 'HALFTIME' : `Q${game.currentPeriod}`} · LIVE
            </Text>
          </View>
        ) : isFinal ? (
          <Text style={[styles.statusText, { color: colors.textMuted }]}>FINAL</Text>
        ) : (
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {game.scheduledAt ? format(new Date(game.scheduledAt), 'EEE, MMM d · h:mm a') : 'TBD'}
          </Text>
        )}
      </View>

      {/* Scoreboard */}
      <View style={[styles.scoreboardCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.scoreboardRow}>
          {/* Away */}
          <View style={styles.teamSide}>
            <Text
              style={[
                styles.teamLabel,
                { color: colors.textMuted },
              ]}
            >
              AWAY
            </Text>
            <Text
              style={[
                styles.teamNameScore,
                { color: isFinal && !isAwayWinner ? colors.textMuted : colors.textPrimary },
              ]}
              numberOfLines={2}
            >
              {game.awayTeam?.name ?? 'TBD'}
            </Text>
            <Text
              style={[
                styles.scoreText,
                { color: isFinal && !isAwayWinner ? colors.textMuted : colors.textPrimary },
              ]}
            >
              {game.awayScore}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.scoreDivider}>
            <Text style={[styles.scoreDividerText, { color: colors.textMuted }]}>
              {isLive || isFinal ? '-' : 'VS'}
            </Text>
          </View>

          {/* Home */}
          <View style={styles.teamSide}>
            <Text
              style={[
                styles.teamLabel,
                { color: colors.textMuted },
              ]}
            >
              HOME
            </Text>
            <Text
              style={[
                styles.teamNameScore,
                { color: isFinal && !isHomeWinner ? colors.textMuted : colors.textPrimary },
              ]}
              numberOfLines={2}
            >
              {game.homeTeam?.name ?? 'TBD'}
            </Text>
            <Text
              style={[
                styles.scoreText,
                { color: isFinal && !isHomeWinner ? colors.textMuted : colors.textPrimary },
              ]}
            >
              {game.homeScore}
            </Text>
          </View>
        </View>
      </View>

      {/* Game Info */}
      <View style={styles.infoRow}>
        {game.event && (
          <TouchableOpacity onPress={() => router.push(`/(tabs)/events/${game.event!.id}`)}>
            <Text style={[styles.eventName, { color: colors.red }]}>{game.event.name}</Text>
          </TouchableOpacity>
        )}
        {game.scheduledAt && (isLive || isFinal) && (
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            {format(new Date(game.scheduledAt), 'EEE, MMM d · h:mm a')}
          </Text>
        )}
        {game.court && (
          <Text style={[styles.infoText, { color: colors.textMuted }]}>{game.court}</Text>
        )}
        {game.division && (
          <Text style={[styles.infoText, { color: colors.textMuted }]}>{game.division}</Text>
        )}
      </View>

      {/* Box Score */}
      {hasStats ? (
        <>
          {/* Team Selector */}
          <View style={[styles.teamSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.teamTab,
                selectedTeam === 'away' && { backgroundColor: colors.red },
              ]}
              onPress={() => setSelectedTeam('away')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.teamTabText,
                  { color: selectedTeam === 'away' ? '#FFFFFF' : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {game.awayTeam?.name ?? 'Away'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.teamTab,
                selectedTeam === 'home' && { backgroundColor: colors.red },
              ]}
              onPress={() => setSelectedTeam('home')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.teamTabText,
                  { color: selectedTeam === 'home' ? '#FFFFFF' : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {game.homeTeam?.name ?? 'Home'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Shooting Summary */}
          <View style={styles.shootingRow}>
            <View style={[styles.shootingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.shootingPct, { color: colors.textPrimary }]}>
                {getPercentage(totals.fgMade, totals.fgAttempted)}
              </Text>
              <Text style={[styles.shootingLabel, { color: colors.textMuted }]}>FG</Text>
              <Text style={[styles.shootingSub, { color: colors.textMuted }]}>
                {totals.fgMade}-{totals.fgAttempted}
              </Text>
            </View>
            <View style={[styles.shootingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.shootingPct, { color: colors.textPrimary }]}>
                {getPercentage(totals.fg3Made, totals.fg3Attempted)}
              </Text>
              <Text style={[styles.shootingLabel, { color: colors.textMuted }]}>3PT</Text>
              <Text style={[styles.shootingSub, { color: colors.textMuted }]}>
                {totals.fg3Made}-{totals.fg3Attempted}
              </Text>
            </View>
            <View style={[styles.shootingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.shootingPct, { color: colors.textPrimary }]}>
                {getPercentage(totals.ftMade, totals.ftAttempted)}
              </Text>
              <Text style={[styles.shootingLabel, { color: colors.textMuted }]}>FT</Text>
              <Text style={[styles.shootingSub, { color: colors.textMuted }]}>
                {totals.ftMade}-{totals.ftAttempted}
              </Text>
            </View>
          </View>

          {/* Box Score Table */}
          <View style={[styles.tableContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>BOX SCORE</Text>
            <View style={styles.tableWrapper}>
              {/* Sticky player name column */}
              <View style={styles.playerColumn}>
                {/* Header */}
                <View style={[styles.tableHeaderCell, styles.playerCell, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.headerText, { color: colors.textMuted }]}>PLAYER</Text>
                </View>
                {/* Player rows */}
                {stats.map((p, idx) => (
                  <TouchableOpacity
                    key={p.playerId}
                    style={[
                      styles.playerCell,
                      styles.tableRow,
                      {
                        backgroundColor: idx % 2 === 0 ? colors.surface : colors.alternateRow,
                        borderBottomColor: colors.border,
                      },
                    ]}
                    onPress={() => router.push(`/players/${p.player.slug}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.jerseyNumber, { color: colors.textMuted }]}>
                      {p.player.jerseyNumber ?? ''}
                    </Text>
                    <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {p.player.lastName}
                    </Text>
                  </TouchableOpacity>
                ))}
                {/* Totals row */}
                <View style={[styles.playerCell, styles.totalsRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalsLabel, { color: colors.textPrimary }]}>TOTALS</Text>
                </View>
              </View>

              {/* Scrollable stat columns */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
                <View>
                  {/* Header row */}
                  <View style={[styles.statHeaderRow, { borderBottomColor: colors.border }]}>
                    {STAT_COLUMNS.map((col) => (
                      <View key={col.key} style={[styles.statCell, { width: col.width }]}>
                        <Text style={[styles.headerText, { color: colors.textMuted }]}>{col.label}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Data rows */}
                  {stats.map((p, idx) => (
                    <View
                      key={p.playerId}
                      style={[
                        styles.statDataRow,
                        {
                          backgroundColor: idx % 2 === 0 ? colors.surface : colors.alternateRow,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      {STAT_COLUMNS.map((col) => (
                        <View key={col.key} style={[styles.statCell, { width: col.width }]}>
                          <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            {getStatValue(p, col.key)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  {/* Totals row */}
                  <View style={[styles.statDataRow, styles.totalsRow, { borderTopColor: colors.border }]}>
                    {STAT_COLUMNS.map((col) => (
                      <View key={col.key} style={[styles.statCell, { width: col.width }]}>
                        <Text style={[styles.totalsText, { color: colors.textPrimary }]}>
                          {col.key === 'fg'
                            ? `${totals.fgMade}-${totals.fgAttempted}`
                            : col.key === '3pt'
                            ? `${totals.fg3Made}-${totals.fg3Attempted}`
                            : col.key === 'ft'
                            ? `${totals.ftMade}-${totals.ftAttempted}`
                            : col.key === 'minutes'
                            ? ''
                            : String((totals as any)[col.key] ?? 0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Stats Available</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            {isLive ? 'Stats will appear as the game is scored.' : 'Box scores will be available once the game is played.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl * 2,
  },
  // Status
  statusContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.headingSemiBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.5,
  },
  // Scoreboard
  scoreboardCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  scoreboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamSide: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  teamLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingSemiBold,
    letterSpacing: 1.5,
  },
  teamNameScore: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 48,
    fontFamily: Fonts.headingBlack,
    lineHeight: 52,
  },
  scoreDivider: {
    width: 40,
    alignItems: 'center',
  },
  scoreDividerText: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.bodySemiBold,
  },
  // Game Info
  infoRow: {
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xxl,
  },
  eventName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },
  infoText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
  },
  // Team Selector
  teamSelector: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  teamTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  teamTabText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },
  // Shooting Summary
  shootingRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  shootingCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  shootingPct: {
    fontSize: FontSize.xl,
    fontFamily: Fonts.heading,
  },
  shootingLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingSemiBold,
    letterSpacing: 1,
    marginTop: 2,
  },
  shootingSub: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  // Box Score Table
  tableContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingSemiBold,
    letterSpacing: 1.5,
    padding: Spacing.md,
    paddingBottom: 0,
  },
  tableWrapper: {
    flexDirection: 'row',
  },
  playerColumn: {
    width: 110,
    zIndex: 1,
  },
  tableHeaderCell: {
    borderBottomWidth: 1,
  },
  playerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 36,
    gap: 6,
  },
  tableRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  jerseyNumber: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    width: 18,
    textAlign: 'center',
  },
  playerName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    flex: 1,
  },
  // Stat columns
  statHeaderRow: {
    flexDirection: 'row',
    height: 36,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  statDataRow: {
    flexDirection: 'row',
    height: 36,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingSemiBold,
    letterSpacing: 0.5,
  },
  statText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
  },
  // Totals
  totalsRow: {
    borderTopWidth: 1,
    borderBottomWidth: 0,
  },
  totalsLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.headingSemiBold,
    letterSpacing: 1,
  },
  totalsText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },
  // Empty state
  emptyCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.headingSemiBold,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    textAlign: 'center',
  },
});
