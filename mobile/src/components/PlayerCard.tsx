import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import type { Player } from '@/types';

interface PlayerCardProps {
  player: Player;
  onPress: () => void;
  compact?: boolean;
}

export function PlayerCard({ player, onPress, compact = false }: PlayerCardProps) {
  const colors = useColors();
  const fullName = `${player.firstName} ${player.lastName}`;
  const details = [player.position, player.graduationYear ? `'${String(player.graduationYear).slice(2)}` : null]
    .filter(Boolean)
    .join(' | ');

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.7}>
        <Image
          source={{ uri: player.profileImageUrl ?? undefined }}
          style={[styles.compactAvatar, { backgroundColor: colors.surfaceLight }]}
          contentFit="cover"
          placeholder={require('../../assets/icon.png')}
          transition={200}
        />
        <View style={styles.compactInfo}>
          <Text style={[styles.compactName, { color: colors.textPrimary }]} numberOfLines={1}>{fullName}</Text>
          <Text style={[styles.compactDetails, { color: colors.textMuted }]}>{details}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: player.profileImageUrl ?? undefined }}
        style={[styles.avatar, { backgroundColor: colors.surfaceLight }]}
        contentFit="cover"
        placeholder={require('../../assets/icon.png')}
        transition={200}
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{fullName}</Text>
        <Text style={[styles.details, { color: colors.red }]}>{details}</Text>
        {player.school && (
          <Text style={[styles.school, { color: colors.textSecondary }]} numberOfLines={1}>{player.school}</Text>
        )}
        {player.city && player.state && (
          <Text style={[styles.location, { color: colors.textMuted }]}>{player.city}, {player.state}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  details: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  school: {
    fontSize: FontSize.sm,
  },
  location: {
    fontSize: FontSize.xs,
  },
  // Compact variant
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  compactAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  compactDetails: {
    fontSize: FontSize.xs,
  },
});
