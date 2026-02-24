import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
  Switch,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
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

  // ── Notification Preferences ─────────────────────────────
  const [showNotifPanel, setShowNotifPanel] = React.useState(false);
  const [notifPrefs, setNotifPrefs] = React.useState({
    newGame: false,
    scheduleChange: false,
    gameChange: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync('notifPrefs');
        if (saved) setNotifPrefs(JSON.parse(saved));
      } catch {}
    })();
  }, []);

  const toggleNotifPref = useCallback(async (key: keyof typeof notifPrefs) => {
    const turningOn = !notifPrefs[key];

    if (turningOn) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert(
            'Permissions Required',
            'Enable notifications in your device settings to receive alerts.',
          );
          return;
        }
      }
    }

    const updated = { ...notifPrefs, [key]: turningOn };
    setNotifPrefs(updated);
    await SecureStore.setItemAsync('notifPrefs', JSON.stringify(updated));
  }, [notifPrefs]);

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

  // Fetch first player's full profile (for career stats)
  const firstPlayerSlug = [...(myPlayers ?? []), ...(guardedPlayers ?? [])][0]?.slug;
  const { data: firstPlayerFull, refetch: refetchPlayerFull } = useQuery({
    queryKey: ['playerFull', firstPlayerSlug],
    queryFn: () => playersApi.getBySlug(firstPlayerSlug!),
    enabled: !!firstPlayerSlug,
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
      return e.isPublished && new Date(e.startDate) > new Date();
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
    await Promise.all([refetchEvents(), refetchPlayers(), refetchGuarded(), refetchEmailLog(), refetchPlayerFull()]);
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
              <Text style={styles.headerName}>Dashboard</Text>
            </View>
            <TouchableOpacity
              style={styles.bellButton}
              activeOpacity={0.7}
              onPress={() => setShowNotifPanel(true)}
            >
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

      {/* ── PLAYER HERO ──────────────────────────────────── */}
      {allPlayers.length > 0 ? (() => {
        const player = allPlayers[0];
        const photoUri = player.profilePhoto ?? player.profileImageUrl;
        const pos = player.primaryPosition ?? player.position;
        const parentGuardians = (player.guardians ?? []).filter(
          (g) => g.role !== 'PLAYER'
        );

        return (
          <TouchableOpacity
            style={styles.heroContainer}
            onPress={() => router.push(`/players/${player.slug}`)}
            activeOpacity={0.9}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.heroImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.heroFallback}>
                <Text style={styles.heroFallbackInitial}>
                  {(player.firstName?.[0] ?? '').toUpperCase()}
                  {(player.lastName?.[0] ?? '').toUpperCase()}
                </Text>
              </View>
            )}

            {/* Gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(15, 23, 42, 0.6)', 'rgba(15, 23, 42, 0.92)', Colors.background]}
              locations={[0, 0.4, 0.75, 1]}
              style={styles.heroGradient}
            />

            {/* Player info overlay */}
            <View style={styles.heroInfoOverlay}>
              <Text style={styles.heroName}>
                {player.firstName} {player.lastName}
              </Text>
              {player.school && (
                <Text style={styles.heroSchool}>{player.school}</Text>
              )}
              <View style={styles.heroMetaRow}>
                {player.graduationYear && (
                  <Text style={styles.heroMetaText}>Class of {player.graduationYear}</Text>
                )}
                {player.graduationYear && pos && (
                  <View style={styles.heroDot} />
                )}
                {pos && (
                  <Text style={styles.heroMetaText}>{pos}</Text>
                )}
              </View>
              {parentGuardians.length > 0 && (
                <View style={styles.heroParentRow}>
                  <Text style={styles.heroParentLabel}>Parent Access</Text>
                  <Text style={styles.heroParentNames}>
                    {parentGuardians.map((g) =>
                      g.user.name?.split(' ')[0] ?? g.user.email?.split('@')[0]
                    ).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })() : (
        <View style={styles.section}>
          <View style={styles.emptyPlayersCard}>
            <Text style={styles.emptyPlayersTitle}>No Players Yet</Text>
            <Text style={styles.emptyPlayersDesc}>
              Your player profiles will appear here once linked to your account.
            </Text>
          </View>
        </View>
      )}

      {/* ── PLAYER STATS ──────────────────────────────────── */}
      {allPlayers.length > 0 && (
        firstPlayerFull?.careerStats ? (
          <TouchableOpacity
            style={styles.statsCard}
            onPress={() => router.push({
              pathname: '/players/game-log',
              params: {
                slug: allPlayers[0].slug,
                playerName: `${allPlayers[0].firstName} ${allPlayers[0].lastName}`,
              },
            })}
            activeOpacity={0.7}
          >
            <View style={styles.statsHeader}>
              <Text style={styles.statsSectionTitle}>SEASON AVERAGES</Text>
              <Text style={styles.statsViewAll}>Game Log ›</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {firstPlayerFull.careerStats.averages.ppg.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>PPG</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {firstPlayerFull.careerStats.averages.rpg.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>RPG</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {firstPlayerFull.careerStats.averages.apg.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>APG</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.statsCard}
            onPress={() => router.push({
              pathname: '/players/game-log',
              params: {
                slug: allPlayers[0].slug,
                playerName: `${allPlayers[0].firstName} ${allPlayers[0].lastName}`,
              },
            })}
            activeOpacity={0.7}
          >
            <View style={styles.statsHeader}>
              <Text style={styles.statsSectionTitle}>SEASON AVERAGES</Text>
              <Text style={styles.statsViewAll}>Game Log ›</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValueEmpty}>—</Text>
                <Text style={styles.statLabel}>PPG</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValueEmpty}>—</Text>
                <Text style={styles.statLabel}>RPG</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValueEmpty}>—</Text>
                <Text style={styles.statLabel}>APG</Text>
              </View>
            </View>
            <Text style={styles.statsEmptyText}>
              Stats will populate once games have been recorded
            </Text>
          </TouchableOpacity>
        )
      )}

      {/* ── UP NEXT ───────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.section}
        onPress={() => router.push('/(tabs)/events')}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, { marginBottom: Spacing.lg }]}>UP NEXT</Text>

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
      </TouchableOpacity>

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

      {/* Bottom spacer for tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>

      {/* ── NOTIFICATION PANEL ─────────────────────────────── */}
      <Modal
        visible={showNotifPanel}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifPanel(false)}
      >
        <Pressable style={styles.notifOverlay} onPress={() => setShowNotifPanel(false)}>
          <Pressable style={styles.notifPanel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>NOTIFICATIONS</Text>
              <TouchableOpacity onPress={() => setShowNotifPanel(false)} style={styles.notifClose}>
                <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 12, height: 1.8, backgroundColor: Colors.textSecondary, borderRadius: 1, transform: [{ rotate: '45deg' }], position: 'absolute' }} />
                  <View style={{ width: 12, height: 1.8, backgroundColor: Colors.textSecondary, borderRadius: 1, transform: [{ rotate: '-45deg' }], position: 'absolute' }} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.notifRow}>
              <View>
                <Text style={styles.notifLabel}>New Game Added</Text>
                <Text style={styles.notifDesc}>When a new game is scheduled</Text>
              </View>
              <Switch
                value={notifPrefs.newGame}
                onValueChange={() => toggleNotifPref('newGame')}
                trackColor={{ false: Colors.surfaceLight, true: Colors.red }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.notifRow}>
              <View>
                <Text style={styles.notifLabel}>Schedule Change</Text>
                <Text style={styles.notifDesc}>Time or date updates</Text>
              </View>
              <Switch
                value={notifPrefs.scheduleChange}
                onValueChange={() => toggleNotifPref('scheduleChange')}
                trackColor={{ false: Colors.surfaceLight, true: Colors.red }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.notifRow, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.notifLabel}>Game Update</Text>
                <Text style={styles.notifDesc}>Score or status changes</Text>
              </View>
              <Switch
                value={notifPrefs.gameChange}
                onValueChange={() => toggleNotifPref('gameChange')}
                trackColor={{ false: Colors.surfaceLight, true: Colors.red }}
                thumbColor="#fff"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    width: 72,
    height: 72,
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
  // Notification Panel
  notifOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingRight: Spacing.lg,
  },
  notifPanel: {
    width: 260,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  notifTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingBlack,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  notifClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  notifLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  notifDesc: {
    fontSize: 10,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  // Hero Profile Image
  heroContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.1,
    marginHorizontal: -Spacing.xl,
    marginBottom: Spacing.xxl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFallbackInitial: {
    fontSize: 72,
    fontFamily: Fonts.headingBlack,
    color: 'rgba(255, 255, 255, 0.15)',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  heroInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  heroName: {
    fontSize: 26,
    fontFamily: Fonts.headingBlack,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSchool: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  heroMetaText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
    color: 'rgba(255, 255, 255, 0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  heroParentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroParentLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  heroParentNames: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
    color: 'rgba(255, 255, 255, 0.7)',
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

  // Player Stats
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xxl,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statsSectionTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingBlack,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  statsViewAll: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontFamily: Fonts.headingBlack,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
    marginTop: 4,
    letterSpacing: 1,
  },
  statValueEmpty: {
    fontSize: 28,
    fontFamily: Fonts.headingBlack,
    color: Colors.textMuted,
  },
  statsEmptyText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
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

});
