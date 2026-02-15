import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import type { Game } from '@/types';

interface GameCardProps {
  game: Game;
  onPress?: () => void;
}

export function GameCard({ game, onPress }: GameCardProps) {
  const isLive = game.status === 'LIVE';
  const isFinal = game.status === 'FINAL';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Status bar */}
      <View style={styles.statusRow}>
        {isLive ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE - Q{game.period}</Text>
          </View>
        ) : isFinal ? (
          <Text style={styles.finalText}>FINAL</Text>
        ) : (
          <Text style={styles.timeText}>
            {game.scheduledTime ? format(new Date(game.scheduledTime), 'h:mm a') : 'TBD'}
          </Text>
        )}
        {game.court && <Text style={styles.courtText}>{game.court}</Text>}
      </View>

      {/* Teams */}
      <View style={styles.matchup}>
        <View style={styles.teamRow}>
          <Text style={[styles.teamName, isFinal && game.awayScore > game.homeScore && styles.winner]} numberOfLines={1}>
            {game.awayTeam?.name ?? 'TBD'}
          </Text>
          <Text style={[styles.score, isFinal && game.awayScore > game.homeScore && styles.winnerScore]}>
            {game.awayScore}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.teamRow}>
          <Text style={[styles.teamName, isFinal && game.homeScore > game.awayScore && styles.winner]} numberOfLines={1}>
            {game.homeTeam?.name ?? 'TBD'}
          </Text>
          <Text style={[styles.score, isFinal && game.homeScore > game.awayScore && styles.winnerScore]}>
            {game.homeScore}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.error,
  },
  liveText: {
    color: Colors.error,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  finalText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timeText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  courtText: {
    color: Colors.textMuted,
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
    color: Colors.textSecondary,
    marginRight: Spacing.md,
  },
  score: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textSecondary,
    minWidth: 36,
    textAlign: 'right',
  },
  winner: {
    color: Colors.textPrimary,
  },
  winnerScore: {
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
