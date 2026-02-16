import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { eventsApi } from '@/api/events';
import { playersApi } from '@/api/players';
import { recruitingApi } from '@/api/recruiting';
import { Loading } from '@/components/ui/Loading';
import type { Player, Event, Game, RecruitingEmailLog } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const firstName = user?.name?.split(' ')[0] ?? 'Player';

  // ── Data Fetching ──────────────────────────────────────────
  const { data: myPlayers, refetch: refetchPlayers } = useQuery({
    queryKey: ['myPlayers'],
    queryFn: playersApi.getMyPlayers,
  });

  const { data: guardedPlayers, refetch: refetchGuarded } = useQuery({
    queryKey: ['guardedPlayers'],
    queryFn: playersApi.getGuardedPlayers,
  });

  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
  });

  const { data: emailLog, refetch: refetchEmailLog } = useQuery({
    queryKey: ['emailLog'],
    queryFn: recruitingApi.getEmailLog,
  });

  // Deduplicate players
  const allPlayersRaw = [...(myPlayers ?? []), ...(guardedPlayers ?? [])];
  const seenIds = new Set<string>();
  const allPlayers: Player[] = allPlayersRaw.filter((p) => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  // Upcoming events (next 3)
  const upcomingEvents = events
    ?.filter((e: Event) => {
      const isUpcoming = e.status === 'PUBLISHED' || e.status === 'ACTIVE';
      return isUpcoming && new Date(e.startDate) > new Date();
    })
    ?.sort((a: Event, b: Event) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    ?.slice(0, 3) ?? [];

  // Fetch games for the first upcoming event (for "Up Next" section)
  const nextEventId = upcomingEvents[0]?.id;
  const { data: upcomingGames } = useQuery({
    queryKey: ['upcomingGames', nextEventId],
    queryFn: () => eventsApi.getGames(nextEventId!),
    enabled: !!nextEventId,
  });

  const scheduledGames = (upcomingGames ?? [])
    .filter((g: Game) => g.status === 'SCHEDULED')
    .sort((a: Game, b: Game) => {
      if (!a.scheduledTime || !b.scheduledTime) return 0;
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
    })
    .slice(0, 3);

  // ── Pull to Refresh ────────────────────────────────────────
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchPlayers(), refetchGuarded(), refetchEmailLog()]);
    setRefreshing(false);
  };

  if (eventsLoading) {
    return <Loading message="Loading..." />;
  }

  const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 80;

  return (
    <View style={styles.container}>
      {/* ── FROSTED GLASS HEADER (sticky) ─────────────────── */}
      <View style={[styles.stickyHeader, { height: HEADER_HEIGHT }]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={[styles.headerInner, { paddingTop: Platform.OS === 'ios' ? 50 : 30 }]}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/eha-connect-logo.png')}
                style={styles.headerLogo}
                contentFit="contain"
              />
              <View>
                <Text style={styles.headerSubtitle}>Player</Text>
                <Text style={styles.headerName}>Dashboard</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
              <BellIcon />
            </TouchableOpacity>
          </View>
        </BlurView>
        <View style={styles.headerBorder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: HEADER_HEIGHT + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />
        }
      >

      {/* ── PLAYER PROFILE ────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PLAYER PROFILE</Text>

        {allPlayers.length > 0 ? (
          <View style={styles.profileCards}>
            {allPlayers.map((player) => {
              const photoUri = player.profilePhoto ?? player.profileImageUrl;
              const pos = player.primaryPosition ?? player.position;
              const parentGuardians = (player.guardians ?? []).filter(
                (g) => g.role !== 'PLAYER'
              );
              const gamesPlayed = player._count?.gameStats ?? 0;

              return (
                <TouchableOpacity
                  key={player.id}
                  style={styles.profileCard}
                  onPress={() => router.push(`/players/${player.slug}`)}
                  activeOpacity={0.7}
                >
                  {/* Top row: photo + info */}
                  <View style={styles.profileCardTop}>
                    {photoUri ? (
                      <Image
                        source={{ uri: photoUri }}
                        style={styles.profilePhoto}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.profilePhotoFallback}>
                        <Text style={styles.profilePhotoInitial}>
                          {(player.firstName?.[0] ?? '').toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileName}>
                        {player.firstName} {player.lastName}
                      </Text>
                      {player.school && (
                        <Text style={styles.profileSchool}>{player.school}</Text>
                      )}
                      <View style={styles.profileBadges}>
                        {player.graduationYear && (
                          <View style={styles.profileBadge}>
                            <Text style={styles.profileBadgeText}>
                              Class of {player.graduationYear}
                            </Text>
                          </View>
                        )}
                        {pos && (
                          <View style={[styles.profileBadge, styles.profileBadgeAlt]}>
                            <Text style={styles.profileBadgeText}>{pos}</Text>
                          </View>
                        )}
                      </View>
                      {gamesPlayed > 0 && (
                        <Text style={styles.profileGames}>
                          {gamesPlayed} Game{gamesPlayed !== 1 ? 's' : ''} Played
                        </Text>
                      )}
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>

                  {/* Guardian / Parent Access row */}
                  {parentGuardians.length > 0 && (
                    <View style={styles.profileAccessRow}>
                      <Text style={styles.profileAccessLabel}>Parent Access</Text>
                      <View style={styles.profileAccessAvatars}>
                        {parentGuardians.map((g) => (
                          <View key={g.user.id} style={styles.guardianChip}>
                            {g.user.image ? (
                              <Image
                                source={{ uri: g.user.image }}
                                style={styles.guardianAvatar}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={styles.guardianAvatarFallback}>
                                <Text style={styles.guardianAvatarInitial}>
                                  {(g.user.name?.[0] ?? g.user.email?.[0] ?? '?').toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <Text style={styles.guardianName} numberOfLines={1}>
                              {g.user.name?.split(' ')[0] ?? g.user.email?.split('@')[0]}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyPlayersCard}>
            <Text style={styles.emptyPlayersTitle}>No Players Yet</Text>
            <Text style={styles.emptyPlayersDesc}>
              Your player profiles will appear here once linked to your account.
            </Text>
          </View>
        )}
      </View>

      {/* ── UP NEXT ───────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>UP NEXT</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {scheduledGames.length > 0 ? (
          <View style={styles.gamesList}>
            {scheduledGames.map((game: Game) => (
              <View key={game.id} style={styles.gameCard}>
                <View style={styles.gameCardLeft}>
                  {game.scheduledTime && (
                    <Text style={styles.gameDate}>
                      {format(new Date(game.scheduledTime), 'MMM d')}
                    </Text>
                  )}
                  {game.scheduledTime && (
                    <Text style={styles.gameTime}>
                      {format(new Date(game.scheduledTime), 'h:mm a')}
                    </Text>
                  )}
                </View>
                <View style={styles.gameCardCenter}>
                  <Text style={styles.gameTeams} numberOfLines={1}>
                    {game.homeTeam?.name ?? 'TBD'} vs {game.awayTeam?.name ?? 'TBD'}
                  </Text>
                  {game.court && (
                    <Text style={styles.gameCourt}>{game.court}</Text>
                  )}
                </View>
                <View style={styles.gameCardChevron}>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </View>
            ))}
          </View>
        ) : upcomingEvents.length > 0 ? (
          <View style={styles.gamesList}>
            {upcomingEvents.map((event: Event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.gameCard}
                onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.gameCardLeft}>
                  <Text style={styles.gameDate}>
                    {format(new Date(event.startDate), 'MMM d')}
                  </Text>
                  <Text style={styles.gameTime}>
                    {format(new Date(event.startDate), 'yyyy')}
                  </Text>
                </View>
                <View style={styles.gameCardCenter}>
                  <Text style={styles.gameTeams} numberOfLines={1}>
                    {event.name}
                  </Text>
                  {event.city && event.state && (
                    <Text style={styles.gameCourt}>{event.city}, {event.state}</Text>
                  )}
                </View>
                <View style={styles.gameCardChevron}>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No upcoming games scheduled</Text>
          </View>
        )}
      </View>

      {/* ── COLLEGE RECRUITING ──────────────────────────────── */}
      {allPlayers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.recruitingCard}>
            {/* Gold accent top bar */}
            <View style={styles.recruitingAccent} />

            {/* Header */}
            <View style={styles.recruitingHeader}>
              <View>
                <Text style={styles.recruitingTitle}>COLLEGE RECRUITING</Text>
                <Text style={styles.recruitingDesc}>
                  Send your profile directly to college coaches
                </Text>
              </View>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </View>
            </View>

            {/* Player rows with Email Coaches button */}
            {allPlayers.map((player) => (
              <View key={player.id} style={styles.recruitingPlayerRow}>
                <View style={styles.recruitingPlayerInfo}>
                  {(player.profilePhoto ?? player.profileImageUrl) ? (
                    <Image
                      source={{ uri: (player.profilePhoto ?? player.profileImageUrl)! }}
                      style={styles.recruitingPlayerAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.recruitingPlayerAvatarFallback}>
                      <Text style={styles.recruitingPlayerInitial}>
                        {(player.firstName?.[0] ?? '').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.recruitingPlayerName}>
                      {player.firstName} {player.lastName}
                    </Text>
                    <Text style={styles.recruitingPlayerMeta}>
                      {player.graduationYear ? `Class of ${player.graduationYear}` : 'No grad year'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.emailCoachesBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/recruiting',
                      params: {
                        playerSlugs: player.slug,
                        playerName: `${player.firstName} ${player.lastName}`,
                      },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.emailCoachesBtnText}>Email Coaches</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Email Log */}
            <View style={styles.recruitingLogSection}>
              <Text style={styles.recruitingLogTitle}>SENT EMAILS</Text>
              {(!emailLog || emailLog.length === 0) ? (
                <Text style={styles.recruitingLogEmpty}>
                  No emails sent yet. Start by emailing a college coach above.
                </Text>
              ) : (
                <View style={styles.recruitingLogList}>
                  {emailLog.slice(0, 5).map((log: RecruitingEmailLog) => (
                    <View key={log.id} style={styles.recruitingLogRow}>
                      <View style={styles.recruitingLogInfo}>
                        <Text style={styles.recruitingLogCoach} numberOfLines={1}>
                          {log.coachName}
                        </Text>
                        <Text style={styles.recruitingLogCollege} numberOfLines={1}>
                          {log.collegeName}
                        </Text>
                      </View>
                      <Text style={styles.recruitingLogDate}>
                        {format(new Date(log.sentAt), 'MM/dd/yy')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ── QUICK ACTIONS ─────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => {
              if (allPlayers[0]?.slug) router.push(`/players/${allPlayers[0].slug}`);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <ShareIcon />
            </View>
            <Text style={styles.quickActionLabel}>Share Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => router.push('/(tabs)/events')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <CalendarIcon />
            </View>
            <Text style={styles.quickActionLabel}>View Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => router.push('/(tabs)/leaderboards')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <TrophyIcon />
            </View>
            <Text style={styles.quickActionLabel}>Rankings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            onPress={() => {
              // Scroll to recruiting card / show email log
              if (allPlayers[0]?.slug) {
                router.push({
                  pathname: '/recruiting',
                  params: {
                    playerSlugs: allPlayers.map((p) => p.slug).join(','),
                    playerName: allPlayers.map((p) => `${p.firstName} ${p.lastName}`).join(', '),
                  },
                });
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <MailIcon />
            </View>
            <Text style={styles.quickActionLabel}>Email Log</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom spacer for tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>
    </View>
  );
}

// ── Inline SVG Icons (lightweight, no dependency) ──────────
function BellIcon() {
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 16, height: 14, borderWidth: 2, borderColor: '#fff',
        borderRadius: 8, borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
      }} />
      <View style={{
        width: 6, height: 3, backgroundColor: '#fff',
        borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginTop: 1,
      }} />
    </View>
  );
}

function ShareIcon() {
  return (
    <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 2, height: 10, backgroundColor: '#fff', position: 'absolute', bottom: 2 }} />
      <View style={{
        width: 8, height: 8, borderRadius: 4,
        borderWidth: 2, borderColor: '#fff', position: 'absolute', top: 0,
      }} />
    </View>
  );
}

function CalendarIcon() {
  return (
    <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 16, height: 14, borderWidth: 2, borderColor: '#fff',
        borderRadius: 3, marginTop: 2,
      }} />
      <View style={{
        width: 16, height: 2, backgroundColor: '#fff',
        position: 'absolute', top: 6,
      }} />
    </View>
  );
}

function TrophyIcon() {
  return (
    <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 12, height: 10, borderWidth: 2, borderColor: '#fff',
        borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
      }} />
      <View style={{ width: 2, height: 4, backgroundColor: '#fff' }} />
      <View style={{ width: 8, height: 2, backgroundColor: '#fff', borderRadius: 1 }} />
    </View>
  );
}

function MailIcon() {
  return (
    <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 16, height: 12, borderWidth: 2, borderColor: '#fff',
        borderRadius: 2,
      }} />
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 5,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: '#fff',
        position: 'absolute', top: 2,
      }} />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },

  // Sticky frosted header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerLogo: {
    width: 44,
    height: 44,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textMuted,
  },
  headerName: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.headingBlack,
    color: Colors.textPrimary,
    marginTop: -1,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
    fontSize: FontSize.md,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  seeAll: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.red,
  },

  // Profile Cards
  profileCards: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.surfaceLight,
  },
  profilePhotoFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoInitial: {
    fontSize: FontSize.xxl,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  profileSchool: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  profileBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  profileBadge: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  profileBadgeAlt: {
    backgroundColor: Colors.red + '20',
  },
  profileBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecondary,
  },
  profileGames: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  profileAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  profileAccessLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
    marginRight: Spacing.md,
  },
  profileAccessAvatars: {
    flexDirection: 'row',
    gap: Spacing.md,
    flex: 1,
  },
  guardianChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  guardianAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  guardianAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardianAvatarInitial: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecondary,
  },
  guardianName: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
    maxWidth: 80,
  },

  // Empty players
  emptyPlayersCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyPlayersTitle: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyPlayersDesc: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Game Cards (Up Next)
  gamesList: {
    gap: Spacing.sm,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gameCardLeft: {
    width: 52,
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  gameDate: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.headingSemiBold,
    color: Colors.red,
  },
  gameTime: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  gameCardCenter: {
    flex: 1,
  },
  gameTeams: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  gameCourt: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  gameCardChevron: {
    marginLeft: Spacing.sm,
  },
  chevron: {
    fontSize: FontSize.xxl,
    color: Colors.textMuted,
    fontWeight: '300',
  },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyCardText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },

  // Recruiting Card
  recruitingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gold + '30',
  },
  recruitingAccent: {
    height: 3,
    backgroundColor: Colors.gold,
  },
  recruitingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold + '15',
  },
  recruitingTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingBlack,
    color: Colors.gold,
    letterSpacing: 2,
  },
  recruitingDesc: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 4,
  },
  premiumBadge: {
    backgroundColor: Colors.gold + '15',
    borderWidth: 1,
    borderColor: Colors.gold + '30',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.headingBlack,
    color: Colors.gold,
    letterSpacing: 1.5,
  },
  recruitingPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recruitingPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  recruitingPlayerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
  },
  recruitingPlayerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recruitingPlayerInitial: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  recruitingPlayerName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  recruitingPlayerMeta: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emailCoachesBtn: {
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  emailCoachesBtnText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textInverse,
  },
  recruitingLogSection: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gold + '15',
  },
  recruitingLogTitle: {
    fontSize: 10,
    fontFamily: Fonts.headingBlack,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  recruitingLogEmpty: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  recruitingLogList: {
    gap: Spacing.sm,
  },
  recruitingLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight + '40',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recruitingLogInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  recruitingLogCoach: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textPrimary,
  },
  recruitingLogCollege: {
    fontSize: 10,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  recruitingLogDate: {
    fontSize: 10,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },

  // Quick Actions (2x2 grid)
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  quickActionPill: {
    width: (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
});
