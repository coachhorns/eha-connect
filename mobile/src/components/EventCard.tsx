import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
  onPress: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isLive = event.status === 'ACTIVE';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {event.imageUrl && (
        <Image
          source={{ uri: event.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          {event.ncaaCertified && (
            <View style={styles.ncaaBadge}>
              <Text style={styles.ncaaText}>NCAA</Text>
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={2}>{event.name}</Text>

        <View style={styles.meta}>
          <Text style={styles.date}>
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </Text>
          {event.city && event.state && (
            <Text style={styles.location}>{event.city}, {event.state}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: '100%',
    height: 140,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textPrimary,
  },
  liveText: {
    color: Colors.textPrimary,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ncaaBadge: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  ncaaText: {
    color: Colors.gold,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  meta: {
    gap: 2,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  location: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
