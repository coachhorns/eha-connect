import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
  onPress: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const colors = useColors();
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const now = new Date();
  const isLive = event.isActive && startDate <= now && endDate >= now;

  return (
    <TouchableOpacity style={[styles.card, { borderColor: colors.border }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
        {event.bannerImage ? (
          <Image
            source={{ uri: event.bannerImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.surfaceLight }]} />
        )}
        {/* Gradient overlay stays dark for text readability on images */}
        <LinearGradient
          colors={['transparent', 'rgba(15, 23, 42, 0.7)', 'rgba(15, 23, 42, 0.97)']}
          locations={[0.25, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top badges */}
        <View style={styles.badges}>
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          {event.isNcaaCertified && (
            <View style={styles.ncaaBadge}>
              <Text style={styles.ncaaText}>NCAA CERTIFIED</Text>
            </View>
          )}
        </View>

        {/* Title + meta overlaid on image — always white text */}
        <View style={styles.overlay}>
          <Text style={styles.name} numberOfLines={2}>{event.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.date}>
              {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
            </Text>
            {(event.venue || (event.city && event.state)) && (
              <>
                <Text style={styles.dot}> · </Text>
                <Text style={styles.location} numberOfLines={1}>
                  {event.venue ?? `${event.city}, ${event.state}`}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageContainer: {
    height: 185,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
  },
  badges: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.red,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 1,
  },
  ncaaBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gold + '55',
  },
  ncaaText: {
    color: Colors.gold,
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
  },
  name: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  date: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
    color: 'rgba(255,255,255,0.8)',
  },
  dot: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.4)',
  },
  location: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.6)',
  },
});
