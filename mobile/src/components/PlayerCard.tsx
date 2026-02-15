import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import type { Player } from '@/types';

interface PlayerCardProps {
  player: Player;
  onPress: () => void;
  compact?: boolean;
}

export function PlayerCard({ player, onPress, compact = false }: PlayerCardProps) {
  const fullName = `${player.firstName} ${player.lastName}`;
  const details = [player.position, player.graduationYear ? `'${String(player.graduationYear).slice(2)}` : null]
    .filter(Boolean)
    .join(' | ');

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.7}>
        <Image
          source={{ uri: player.profileImageUrl ?? undefined }}
          style={styles.compactAvatar}
          contentFit="cover"
          placeholder={require('../../assets/icon.png')}
          transition={200}
        />
        <View style={styles.compactInfo}>
          <Text style={styles.compactName} numberOfLines={1}>{fullName}</Text>
          <Text style={styles.compactDetails}>{details}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Image
        source={{ uri: player.profileImageUrl ?? undefined }}
        style={styles.avatar}
        contentFit="cover"
        placeholder={require('../../assets/icon.png')}
        transition={200}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
        <Text style={styles.details}>{details}</Text>
        {player.school && (
          <Text style={styles.school} numberOfLines={1}>{player.school}</Text>
        )}
        {player.city && player.state && (
          <Text style={styles.location}>{player.city}, {player.state}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceLight,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  details: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.red,
  },
  school: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  location: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
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
    backgroundColor: Colors.surfaceLight,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  compactDetails: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
