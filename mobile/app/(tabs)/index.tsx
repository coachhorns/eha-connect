import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { eventsApi } from '@/api/events';
import { playersApi } from '@/api/players';
import { EventCard } from '@/components/EventCard';
import { Loading } from '@/components/ui/Loading';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
  });

  const { data: myPlayers, refetch: refetchPlayers } = useQuery({
    queryKey: ['myPlayers'],
    queryFn: playersApi.getMyPlayers,
  });

  const { data: guardedPlayers, refetch: refetchGuarded } = useQuery({
    queryKey: ['guardedPlayers'],
    queryFn: playersApi.getGuardedPlayers,
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchPlayers(), refetchGuarded()]);
    setRefreshing(false);
  };

  const allPlayersRaw = [...(myPlayers ?? []), ...(guardedPlayers ?? [])];
  const seenIds = new Set<string>();
  const allPlayers = allPlayersRaw.filter((p: any) => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });
  const activeEvents = events?.filter((e: any) => e.status === 'ACTIVE' || e.isActive) ?? [];
  const upcomingEvents = events
    ?.filter((e: any) => (e.status === 'PUBLISHED' || e.isPublished) && new Date(e.startDate) > new Date())
    ?.slice(0, 3) ?? [];

  const isAdmin = user?.role === 'ADMIN';
  const isDirector = user?.role === 'PROGRAM_DIRECTOR';
  const isParentOrPlayer = user?.role === 'PARENT' || user?.role === 'PLAYER';

  if (eventsLoading) {
    return <Loading message="Loading..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />
      }
    >
      {/* Header with logo */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/eha-connect-logo.png')}
          style={styles.headerLogo}
          contentFit="contain"
        />
        <View>
          <Text style={styles.greeting}>
            {user?.name ? user.name.split(' ')[0] : 'Welcome'}
          </Text>
          <Text style={styles.roleBadgeText}>
            {user?.role?.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* ── ADMIN VIEW ─────────────────────────── */}
      {isAdmin && (
        <>
          {/* Overview Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{events?.length ?? 0}</Text>
              <Text style={styles.statLabel}>EVENTS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{activeEvents.length}</Text>
              <Text style={styles.statLabel}>LIVE</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{upcomingEvents.length}</Text>
              <Text style={styles.statLabel}>UPCOMING</Text>
            </View>
          </View>

          {/* Admin Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.adminActions}>
            <TouchableOpacity
              style={styles.adminActionCard}
              onPress={() => router.push('/(tabs)/events')}
              activeOpacity={0.7}
            >
              <View style={[styles.adminActionIcon, { backgroundColor: Colors.red }]}>
                <Text style={styles.adminActionIconText}>E</Text>
              </View>
              <View style={styles.adminActionInfo}>
                <Text style={styles.adminActionTitle}>Events</Text>
                <Text style={styles.adminActionDesc}>View all events and schedules</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminActionCard}
              onPress={() => router.push('/(tabs)/leaderboards')}
              activeOpacity={0.7}
            >
              <View style={[styles.adminActionIcon, { backgroundColor: Colors.gold }]}>
                <Text style={styles.adminActionIconText}>L</Text>
              </View>
              <View style={styles.adminActionInfo}>
                <Text style={styles.adminActionTitle}>Leaderboards</Text>
                <Text style={styles.adminActionDesc}>Stat leaders across events</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminActionCard}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.adminActionIcon, { backgroundColor: Colors.navy }]}>
                <Text style={styles.adminActionIconText}>P</Text>
              </View>
              <View style={styles.adminActionInfo}>
                <Text style={styles.adminActionTitle}>Players</Text>
                <Text style={styles.adminActionDesc}>Search and view player profiles</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── DIRECTOR VIEW ──────────────────────── */}
      {isDirector && (
        <>
          {/* Program Card */}
          <View style={styles.programCard}>
            <Text style={styles.programLabel}>YOUR PROGRAM</Text>
            <Text style={styles.programName}>Program Dashboard</Text>
            <Text style={styles.programDesc}>
              Manage your teams, rosters, and recruiting from the web dashboard.
              View events and leaderboards here.
            </Text>
          </View>

          {/* Director Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.adminActions}>
            <TouchableOpacity
              style={styles.adminActionCard}
              onPress={() => router.push('/(tabs)/events')}
              activeOpacity={0.7}
            >
              <View style={[styles.adminActionIcon, { backgroundColor: Colors.red }]}>
                <Text style={styles.adminActionIconText}>E</Text>
              </View>
              <View style={styles.adminActionInfo}>
                <Text style={styles.adminActionTitle}>Browse Events</Text>
                <Text style={styles.adminActionDesc}>Find tournaments for your teams</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminActionCard}
              onPress={() => router.push('/(tabs)/leaderboards')}
              activeOpacity={0.7}
            >
              <View style={[styles.adminActionIcon, { backgroundColor: Colors.gold }]}>
                <Text style={styles.adminActionIconText}>L</Text>
              </View>
              <View style={styles.adminActionInfo}>
                <Text style={styles.adminActionTitle}>Leaderboards</Text>
                <Text style={styles.adminActionDesc}>Stat leaders across events</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── PARENT / PLAYER VIEW ───────────────── */}
      {isParentOrPlayer && (
        <>
          {/* Player Profiles */}
          {allPlayers.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Player Profiles</Text>
              {allPlayers.map((player: any) => (
                <TouchableOpacity
                  key={player.id}
                  style={styles.playerCard}
                  onPress={() => router.push(`/players/${player.slug}`)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: player.profilePhoto ?? player.profileImageUrl ?? undefined }}
                    style={styles.playerAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>
                      {player.firstName} {player.lastName}
                    </Text>
                    <Text style={styles.playerMeta}>
                      {[player.primaryPosition ?? player.position, player.graduationYear ? `Class of ${player.graduationYear}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {player.school && (
                      <Text style={styles.playerSchool}>{player.school}</Text>
                    )}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Welcome to EHA Connect!</Text>
              <Text style={styles.welcomeDesc}>
                Your player profile will appear here once your coach or program director adds you to a roster.
              </Text>
            </View>
          )}

          {/* Quick Actions for Parents/Players */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/(tabs)/events')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionDot, { backgroundColor: Colors.red }]} />
              <Text style={styles.quickActionText}>Events</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/(tabs)/leaderboards')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionDot, { backgroundColor: Colors.gold }]} />
              <Text style={styles.quickActionText}>Leaders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionDot, { backgroundColor: Colors.info }]} />
              <Text style={styles.quickActionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── LIVE EVENTS (all roles) ────────────── */}
      {activeEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>Live Now</Text>
            </View>
          </View>
          <View style={styles.eventsList}>
            {activeEvents.map((event: any) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/(tabs)/events/${event.id}`)}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── UPCOMING EVENTS (all roles) ────────── */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.eventsList}>
            {upcomingEvents.map((event: any) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/(tabs)/events/${event.id}`)}
              />
            ))}
          </View>
        </View>
      )}

      {/* No events fallback */}
      {activeEvents.length === 0 && upcomingEvents.length === 0 && (
        <View style={styles.noEvents}>
          <Text style={styles.noEventsTitle}>No Upcoming Events</Text>
          <Text style={styles.noEventsDesc}>
            Check back soon for new tournaments and events.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push('/(tabs)/events')}
            activeOpacity={0.7}
          >
            <Text style={styles.browseBtnText}>Browse All Events</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  headerLogo: {
    width: 56,
    height: 56,
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  roleBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 2,
  },

  // Stats grid (admin)
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  statNumber: {
    fontSize: FontSize.xxxl,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
    marginTop: 4,
  },

  // Admin action cards
  adminActions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  adminActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.lg,
  },
  adminActionIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminActionIconText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  adminActionInfo: {
    flex: 1,
  },
  adminActionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  adminActionDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: FontSize.xxl,
    color: Colors.textMuted,
    fontWeight: '300',
  },

  // Director program card
  programCard: {
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    marginBottom: Spacing.xxl,
  },
  programLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gold,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  programName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  programDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Player cards (parent/player)
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  playerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.red,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  playerMeta: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.red,
    marginTop: 2,
  },
  playerSchool: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Welcome card (no players)
  welcomeCard: {
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    marginBottom: Spacing.xxl,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  welcomeDesc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Quick actions (parent/player)
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  quickActionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  quickActionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
  },
  seeAll: {
    fontSize: FontSize.sm,
    color: Colors.red,
    fontWeight: '600',
  },
  eventsList: {
    gap: Spacing.md,
  },

  // No events
  noEvents: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noEventsTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  noEventsDesc: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  browseBtn: {
    backgroundColor: Colors.red,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  browseBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
