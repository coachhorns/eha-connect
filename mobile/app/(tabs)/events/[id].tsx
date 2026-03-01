import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { eventsApi } from '@/api/events';
import { GameCard } from '@/components/GameCard';
import { Loading } from '@/components/ui/Loading';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { RecruitingPacketSheet } from '@/components/RecruitingPacketSheet';
import { RegisterTeamSheet } from '@/components/RegisterTeamSheet';
import type { Game, EventStandingEntry } from '@/types';

type Segment = 'info' | 'schedule' | 'standings';

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'info', label: 'Info' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'standings', label: 'Standings' },
];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const [segment, setSegment] = useState<Segment>('info');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showPacket, setShowPacket] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id),
  });

  const { data: games, refetch: refetchGames } = useQuery({
    queryKey: ['event-games', id],
    queryFn: () => eventsApi.getGames(id),
    enabled: segment === 'schedule',
  });

  const { data: standings } = useQuery({
    queryKey: ['event-standings', id],
    queryFn: () => eventsApi.getStandings(id),
    enabled: segment === 'standings',
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchGames();
    setRefreshing(false);
  };

  // Extract unique divisions from team ageGroup
  const divisions = useMemo(() => {
    if (!games) return [];
    const divSet = new Set<string>();
    games.forEach(g => {
      if (g.homeTeam?.ageGroup) divSet.add(g.homeTeam.ageGroup);
      if (g.awayTeam?.ageGroup) divSet.add(g.awayTeam.ageGroup);
    });
    return Array.from(divSet).sort();
  }, [games]);

  // Filter games by selected division
  const filteredGames = useMemo(() => {
    if (!games) return [];
    if (divisionFilter === 'all') return games;
    return games.filter(
      g =>
        g.homeTeam?.ageGroup === divisionFilter ||
        g.awayTeam?.ageGroup === divisionFilter,
    );
  }, [games, divisionFilter]);

  // Group filtered games by calendar day
  const gamesByDay = useMemo(() => {
    if (!filteredGames.length) return [];
    const map = new Map<string, Game[]>();
    filteredGames.forEach(g => {
      const key = g.scheduledTime
        ? format(new Date(g.scheduledTime), 'yyyy-MM-dd')
        : 'TBD';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });
    return Array.from(map.entries()).map(([dateKey, dayGames]) => ({
      dateKey,
      label:
        dateKey === 'TBD'
          ? 'Time TBD'
          : format(new Date(dateKey + 'T12:00:00'), 'EEEE, MMMM d'),
      games: dayGames,
    }));
  }, [filteredGames]);

  const openDirections = () => {
    if (!event) return;
    const parts = [event.venue, event.city, event.state].filter(Boolean);
    const query = encodeURIComponent(parts.join(', '));
    const url =
      Platform.OS === 'ios'
        ? `maps://?q=${query}`
        : `https://maps.google.com/?q=${query}`;
    Linking.openURL(url);
  };

  const poolKeys = standings ? Object.keys(standings) : [];
  const multiPool = poolKeys.length > 1;

  if (isLoading || !event) {
    return <Loading message="Loading event..." />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.textMuted}
        />
      }
    >
      {/* ── Hero — text on image, keep hardcoded dark styling ── */}
      <View style={[styles.hero, { backgroundColor: colors.surfaceLight }]}>
        {event.bannerImage ? (
          <Image
            source={{ uri: event.bannerImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: colors.surfaceLight }]} />
        )}
        <LinearGradient
          colors={[
            'transparent',
            'rgba(15, 23, 42, 0.45)',
            'rgba(15, 23, 42, 0.92)',
            colors.background,
          ]}
          locations={[0, 0.4, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Back button — on image, keep hardcoded */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Events</Text>
        </TouchableOpacity>

        {/* Event info — on image, keep hardcoded white text */}
        <View style={styles.heroInfo}>
          <View style={styles.badges}>
            {event.isActive && new Date(event.startDate) <= new Date() && new Date(event.endDate) >= new Date() && (
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
          <Text style={styles.heroName}>{event.name}</Text>
          <Text style={styles.heroDate}>
            {format(new Date(event.startDate), 'MMM d')} –{' '}
            {format(new Date(event.endDate), 'MMM d, yyyy')}
          </Text>
          {(event.venue || (event.city && event.state)) && (
            <Text style={styles.heroLocation}>
              {event.venue ?? `${event.city}, ${event.state}`}
            </Text>
          )}
        </View>
      </View>

      {/* ── Segment bar ── */}
      <View style={[styles.segmentBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        {SEGMENTS.map(seg => (
          <TouchableOpacity
            key={seg.key}
            style={[
              styles.segment,
              segment === seg.key && { borderBottomColor: colors.textPrimary },
            ]}
            onPress={() => setSegment(seg.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                { color: colors.textMuted },
                segment === seg.key && { color: colors.textPrimary, fontFamily: Fonts.bodySemiBold },
              ]}
            >
              {seg.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>

        {/* INFO */}
        {segment === 'info' && (
          <View style={styles.infoStack}>
            {event.description ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>About This Event</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{event.description}</Text>
              </View>
            ) : null}

            {event.divisions?.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Divisions</Text>
                <View style={styles.divisionsWrap}>
                  {event.divisions.map(div => (
                    <View key={div} style={[styles.divisionChip, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                      <Text style={[styles.divisionChipText, { color: colors.textSecondary }]}>{div}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Venue</Text>
              {(event.venue || event.city) && (() => {
                const q = encodeURIComponent(
                  [event.venue, event.address, event.city, event.state].filter(Boolean).join(', ')
                );
                const mapHtml = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;}html,body,iframe{width:100%;height:100%;border:0;}</style></head><body><iframe src="https://maps.google.com/maps?q=${q}&t=&z=14&ie=UTF8&iwloc=&output=embed" frameborder="0" scrolling="no" allowfullscreen></iframe></body></html>`;
                return (
                  <View style={[styles.mapContainer, { backgroundColor: colors.surfaceLight }]}>
                    <WebView
                      source={{ html: mapHtml }}
                      style={styles.map}
                      scrollEnabled={false}
                      originWhitelist={['*']}
                    />
                  </View>
                );
              })()}
              <View style={styles.venueRow}>
                <View style={[styles.pinIcon, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name="location-outline" size={20} color={colors.textMuted} />
                </View>
                <View style={styles.venueText}>
                  {event.venue ? (
                    <Text style={[styles.venueName, { color: colors.textPrimary }]}>{event.venue}</Text>
                  ) : null}
                  {event.city && event.state ? (
                    <Text style={[styles.venueCity, { color: colors.textMuted }]}>
                      {event.city}, {event.state}
                    </Text>
                  ) : null}
                  {!event.venue && !event.city && (
                    <Text style={[styles.venueCity, { color: colors.textMuted }]}>Location TBA</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.directionsBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                onPress={openDirections}
                activeOpacity={0.85}
              >
                <Text style={[styles.directionsBtnText, { color: colors.textSecondary }]}>Get Directions</Text>
              </TouchableOpacity>
            </View>

            {/* College Recruiting Packet */}
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowPacket(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionCardIcon, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name="school-outline" size={22} color={colors.textSecondary} />
              </View>
              <View style={styles.actionCardText}>
                <Text style={[styles.actionCardTitle, { color: colors.textPrimary }]}>College Recruiting Packet</Text>
                <Text style={[styles.actionCardSub, { color: colors.textMuted }]}>
                  Access rosters, contacts & live stats for college coaches
                </Text>
              </View>
              <Text style={[styles.actionCardChevron, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>

            {/* Register Your Team */}
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowRegister(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionCardIcon, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name="people-outline" size={22} color={colors.textSecondary} />
              </View>
              <View style={styles.actionCardText}>
                <Text style={[styles.actionCardTitle, { color: colors.textPrimary }]}>Register Your Team</Text>
                <Text style={[styles.actionCardSub, { color: colors.textMuted }]}>
                  {user?.role === 'PROGRAM_DIRECTOR'
                    ? 'Submit your team(s) and scheduling preferences'
                    : 'Club directors can register teams for this event'}
                </Text>
              </View>
              <Text style={[styles.actionCardChevron, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SCHEDULE */}
        {segment === 'schedule' && (
          <View>
            {/* Division filter */}
            {divisions.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.divisionRow}
              >
                <TouchableOpacity
                  style={[
                    styles.divChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    divisionFilter === 'all' && { backgroundColor: colors.surfaceLight, borderColor: colors.textSecondary },
                  ]}
                  onPress={() => setDivisionFilter('all')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.divChipText,
                      { color: colors.textSecondary },
                      divisionFilter === 'all' && { color: colors.textPrimary },
                    ]}
                  >
                    All Divisions
                  </Text>
                </TouchableOpacity>
                {divisions.map(div => (
                  <TouchableOpacity
                    key={div}
                    style={[
                      styles.divChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      divisionFilter === div && { backgroundColor: colors.surfaceLight, borderColor: colors.textSecondary },
                    ]}
                    onPress={() => setDivisionFilter(div)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.divChipText,
                        { color: colors.textSecondary },
                        divisionFilter === div && { color: colors.textPrimary },
                      ]}
                    >
                      {div}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {gamesByDay.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No games scheduled yet</Text>
            ) : (
              gamesByDay.map(day => (
                <View key={day.dateKey} style={styles.dayGroup}>
                  <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{day.label}</Text>
                  <View style={styles.dayGames}>
                    {day.games.map(game => (
                      <GameCard key={game.id} game={game} onPress={() => router.push(`/games/${game.id}`)} />
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* STANDINGS */}
        {segment === 'standings' && (
          <View>
            {poolKeys.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No standings available yet</Text>
            )}

            {poolKeys.map(pool => (
              <View key={pool} style={[styles.table, { borderColor: colors.border }, multiPool && { marginBottom: Spacing.lg }]}>
                {multiPool && (
                  <Text style={[styles.poolLabel, { color: colors.textMuted, backgroundColor: colors.surfaceLight }]}>{pool}</Text>
                )}

                {/* Header row */}
                <View style={[styles.tableRow, { backgroundColor: colors.navy }]}>
                  <Text style={[styles.cell, styles.rankCell, styles.headerCell]}>
                    #
                  </Text>
                  <Text style={[styles.cell, styles.teamCell, styles.headerCell]}>
                    Team
                  </Text>
                  <Text style={[styles.cell, styles.headerCell]}>W</Text>
                  <Text style={[styles.cell, styles.headerCell]}>L</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Diff</Text>
                </View>

                {standings![pool].map((s: EventStandingEntry, i: number) => (
                  <View
                    key={s.teamId}
                    style={[
                      styles.tableRow,
                      { backgroundColor: colors.surface },
                      i % 2 !== 0 && { backgroundColor: colors.surfaceLight },
                    ]}
                  >
                    <Text style={[styles.cell, styles.rankCell, styles.rankText, { color: colors.textMuted }]}>
                      {i + 1}
                    </Text>
                    <Text
                      style={[styles.cell, styles.teamCell, styles.teamNameText, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {s.teamName}
                    </Text>
                    <Text style={[styles.cell, styles.statText, { color: colors.textSecondary }]}>{s.wins}</Text>
                    <Text style={[styles.cell, styles.statText, { color: colors.textSecondary }]}>{s.losses}</Text>
                    <Text
                      style={[
                        styles.cell,
                        styles.statText,
                        { color: colors.textSecondary },
                        s.pointDiff > 0 && { color: colors.success, fontFamily: Fonts.bodySemiBold },
                        s.pointDiff < 0 && { color: colors.red, fontFamily: Fonts.bodySemiBold },
                      ]}
                    >
                      {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>

      <RecruitingPacketSheet
        visible={showPacket}
        onClose={() => setShowPacket(false)}
        eventId={event.id}
        eventName={event.name}
      />

      <RegisterTeamSheet
        visible={showRegister}
        onClose={() => setShowRegister(false)}
        event={event}
        userRole={user?.role}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Hero — text on image, hardcoded dark colors kept in JSX
  hero: {
    height: 340,
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backChevron: {
    fontSize: 24,
    color: Colors.textSecondary,
    lineHeight: 28,
  },
  backLabel: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
  heroName: {
    fontSize: FontSize.xxl,
    fontFamily: Fonts.headingBlack,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroDate: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodyMedium,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  heroLocation: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.55)',
  },

  // Segment bar
  segmentBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodyMedium,
  },

  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },

  // Info
  infoStack: {
    gap: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  cardLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
    lineHeight: 22,
  },
  divisionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  divisionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  divisionChipText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
  },
  mapContainer: {
    height: 180,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  venueRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
  },
  pinIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueText: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 2,
  },
  venueName: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodyMedium,
    marginBottom: 2,
  },
  venueCity: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
  },
  directionsBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  directionsBtnText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodyBold,
  },
  actionCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionCardText: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
    marginBottom: 2,
  },
  actionCardSub: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    lineHeight: 16,
  },
  actionCardChevron: {
    fontSize: 22,
    lineHeight: 26,
    flexShrink: 0,
  },

  // Schedule
  divisionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  divChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  divChipText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
  },
  dayGroup: {
    marginBottom: Spacing.xl,
  },
  dayLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  dayGames: {
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
    textAlign: 'center',
    paddingVertical: 40,
  },

  poolLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  // Standings table
  table: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  cell: {
    width: 44,
    textAlign: 'center',
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
  },
  rankCell: {
    width: 28,
  },
  teamCell: {
    flex: 1,
    textAlign: 'left',
    width: undefined,
  },
  headerCell: {
    fontFamily: Fonts.bodyBold,
    color: Colors.textPrimary,
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rankText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.sm,
  },
  teamNameText: {
    fontFamily: Fonts.bodySemiBold,
  },
  statText: {
    fontFamily: Fonts.body,
  },
});
