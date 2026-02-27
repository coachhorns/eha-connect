import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import type { Game } from '@/types';

interface GameCardProps {
  game: Game;
  onPress?: () => void;
}

export function GameCard({ game, onPress }: GameCardProps) {
  const colors = useColors();
  const isLive = game.status === 'LIVE';
  const isFinal = game.status === 'FINAL';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Status bar */}
      <View style={styles.statusRow}>
        {isLive ? (
          <View style={styles.liveBadge}>
            <View style={[styles.liveDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.liveText, { color: colors.error }]}>LIVE - Q{game.period}</Text>
          </View>
        ) : isFinal ? (
          <Text style={[styles.finalText, { color: colors.textMuted }]}>FINAL</Text>
        ) : (
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {game.scheduledTime ? format(new Date(game.scheduledTime), 'h:mm a') : 'TBD'}
          </Text>
        )}
        {game.court && <Text style={[styles.courtText, { color: colors.textMuted }]}>{game.court}</Text>}
      </View>

      {/* Teams */}
      <View style={styles.matchup}>
        <View style={styles.teamRow}>
          <Text style={[styles.teamName, { color: colors.textSecondary }, isFinal && game.awayScore > game.homeScore && { color: colors.textPrimary }]} numberOfLines={1}>
            {game.awayTeam?.name ?? 'TBD'}
          </Text>
          <Text style={[styles.score, { color: colors.textSecondary }, isFinal && game.awayScore > game.homeScore && { color: colors.textPrimary }]}>
            {game.awayScore}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.teamRow}>
          <Text style={[styles.teamName, { color: colors.textSecondary }, isFinal && game.homeScore > game.awayScore && { color: colors.textPrimary }]} numberOfLines={1}>
            {game.homeTeam?.name ?? 'TBD'}
          </Text>
          <Text style={[styles.score, { color: colors.textSecondary }, isFinal && game.homeScore > game.awayScore && { color: colors.textPrimary }]}>
            {game.homeScore}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  finalText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timeText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  courtText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  matchup: {
    gap: Spacing.sm,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginRight: Spacing.md,
  },
  score: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    minWidth: 36,
    textAlign: 'right',
  },
  divider: {
    height: 1,
  },
});
