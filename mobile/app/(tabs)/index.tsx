import React, { useEffect, useCallback, useRef } from 'react';
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
import { useRouter, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { playersApi } from '@/api/players';
import { eventsApi } from '@/api/events';
import { recruitingApi } from '@/api/recruiting';
import { Loading } from '@/components/ui/Loading';
import { GameCard } from '@/components/GameCard';
import { ParentDashboard } from '@/components/ParentDashboard';
import type { Player, RecruitingEmailLog, ResultGame } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();

  // Parents get a dedicated dashboard
  if (user?.role === 'PARENT') {
    return <ParentDashboard />;
  }

  return <PlayerDashboard />;
}

function PlayerDashboard() {
  const { user } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const firstName = user?.name?.split(' ')[0] ?? 'Player';

  // ── Tab Press Reset ───────────────────────────────────────
  useEffect(() => {
    const unsub = navigation.addListener('tabPress' as any, () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return unsub;
  }, [navigation]);

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

  const firstPlayer = allPlayers[0];

  // Fetch first player's full profile (for career stats)
  const { data: firstPlayerFull, refetch: refetchPlayerFull, isLoading: playerLoading } = useQuery({
    queryKey: ['playerFull', firstPlayer?.slug],
    queryFn: () => playersApi.getBySlug(firstPlayer!.slug),
    enabled: !!firstPlayer?.slug,
  });

  // Fetch upcoming games for the player
  const { data: upcomingGames, refetch: refetchGames } = useQuery({
    queryKey: ['upcomingGames', firstPlayer?.id],
    queryFn: () => playersApi.getUpcomingGames(firstPlayer!.id),
    enabled: !!firstPlayer?.id,
  });

  const scheduledGames = (upcomingGames ?? []).slice(0, 5);

  // Fetch live & recent results (public, all roles)
  const { data: recentResults, refetch: refetchResults } = useQuery({
    queryKey: ['recentResults'],
    queryFn: () => eventsApi.getRecentResults(10),
    refetchInterval: (query) => {
      const games = query.state.data?.games;
      if (games?.some((g: ResultGame) => g.status === 'IN_PROGRESS' || g.status === 'HALFTIME')) {
        return 15000;
      }
      return 60000;
    },
  });

  const liveGames = (recentResults?.games ?? []).filter(
    (g: ResultGame) => g.status === 'IN_PROGRESS' || g.status === 'HALFTIME',
  );
  const finalGames = (recentResults?.games ?? []).filter(
    (g: ResultGame) => g.status === 'FINAL',
  ).slice(0, 5);
  const scoreGames = [...liveGames, ...finalGames];

  // ── Pull to Refresh ────────────────────────────────────────
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPlayers(), refetchGuarded(), refetchEmailLog(), refetchPlayerFull(), refetchGames(), refetchResults()]);
    setRefreshing(false);
  };

  if (playerLoading && !firstPlayerFull) {
    return <Loading message="Loading..." />;
  }

  const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 80;
  const player = firstPlayer;
  const stats = firstPlayerFull?.careerStats;
  const photoUri = player?.profilePhoto ?? player?.profileImageUrl;
  const pos = player?.primaryPosition ?? player?.position;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── FROSTED GLASS HEADER (sticky) ─────────────────── */}
      <View style={[styles.stickyHeader, { height: HEADER_HEIGHT }]}>
        <BlurView intensity={80} tint={colors.glassTint} style={StyleSheet.absoluteFill}>
          <View style={[styles.headerInner, { paddingTop: Platform.OS === 'ios' ? 50 : 30, backgroundColor: colors.headerOverlay }]}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/eha-connect-logo.png')}
                style={styles.headerLogo}
                contentFit="contain"
              />
              <Text style={[styles.headerName, { color: colors.textPrimary }]}>Dashboard</Text>
            </View>
            <TouchableOpacity
              style={[styles.bellButton, { backgroundColor: colors.inputOverlay, borderColor: colors.inputBorder }]}
              activeOpacity={0.7}
              onPress={() => setShowNotifPanel(true)}
            >
              <BellIcon />
            </TouchableOpacity>
          </View>
        </BlurView>
        <View style={[styles.headerBorder, { backgroundColor: colors.headerBorder }]} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: HEADER_HEIGHT + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.red} />
        }
      >

      {/* ── WELCOME ──────────────────────────────────────── */}
      <View style={styles.welcomeSection}>
        <Text style={[styles.welcomeText, { color: colors.textPrimary }]}>Hi, {firstName}</Text>
        {player && (
          <Text style={[styles.welcomeSubtext, { color: colors.textMuted }]}>
            {[player.school, player.graduationYear ? `Class of ${player.graduationYear}` : null, pos].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>

      {/* ── PLAYER CARD ──────────────────────────────────── */}
      {player ? (
        <View style={[styles.playerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.playerCardTop}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.playerPhoto} contentFit="cover" />
            ) : (
              <View style={[styles.playerPhotoFallback, { backgroundColor: colors.surfaceLight }]}>
                <Text style={[styles.playerInitials, { color: colors.textPrimary }]}>
                  {(player.firstName?.[0] ?? '').toUpperCase()}
                  {(player.lastName?.[0] ?? '').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.playerInfo}>
              <Text style={[styles.playerName, { color: colors.textPrimary }]}>
                {player.firstName} {player.lastName}
              </Text>
              {player.school && (
                <Text style={[styles.playerMeta, { color: colors.textMuted }]}>{player.school}</Text>
              )}
              <Text style={[styles.playerMeta, { color: colors.textMuted }]}>
                {[player.graduationYear ? `Class of ${player.graduationYear}` : null, pos].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats?.averages?.ppg?.toFixed(1) ?? '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>PPG</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats?.averages?.rpg?.toFixed(1) ?? '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>RPG</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats?.averages?.apg?.toFixed(1) ?? '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>APG</Text>
            </View>
          </View>

          {/* View Profile button */}
          <TouchableOpacity
            style={[styles.viewProfileBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewProfileBtnText, { color: colors.textPrimary }]}>View Profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyCardTitle, { color: colors.textPrimary }]}>No Player Profile</Text>
          <Text style={[styles.emptyCardDesc, { color: colors.textMuted }]}>
            Your player profile will appear here once linked to your account.
          </Text>
        </View>
      )}

      {/* ── LIVE & RECENT SCORES ──────────────────────────── */}
      {scoreGames.length > 0 && (
        <View style={styles.section}>
          <View style={styles.liveHeader}>
            {liveGames.length > 0 && <View style={[styles.liveHeaderDot, { backgroundColor: colors.error }]} />}
            <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0 }]}>
              {liveGames.length > 0 ? 'LIVE SCORES' : 'RECENT RESULTS'}
            </Text>
          </View>
          <View style={styles.gamesList}>
            {scoreGames.map((game: ResultGame) => (
              <GameCard
                key={game.id}
                game={{
                  id: game.id,
                  eventId: game.event?.id ?? '',
                  homeTeamId: game.homeTeamId,
                  awayTeamId: game.awayTeamId,
                  homeTeam: { ...game.homeTeam, organization: null, ageGroup: null, logoUrl: game.homeTeam.logo },
                  awayTeam: { ...game.awayTeam, organization: null, ageGroup: null, logoUrl: game.awayTeam.logo },
                  homeScore: game.homeScore,
                  awayScore: game.awayScore,
                  status: game.status === 'IN_PROGRESS' || game.status === 'HALFTIME' ? 'LIVE' : game.status as any,
                  scheduledTime: game.scheduledAt,
                  court: game.court,
                  period: game.currentPeriod,
                }}
                onPress={() => router.push(`/games/${game.id}`)}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── UPCOMING GAMES ───────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>UPCOMING GAMES</Text>

        {scheduledGames.length > 0 ? (
          <View style={styles.gamesList}>
            {scheduledGames.map((game: any) => (
              <TouchableOpacity
                key={game.id}
                style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(`/games/${game.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.gameCardLeft}>
                  {game.scheduledAt && (
                    <>
                      <Text style={[styles.gameDate, { color: colors.red }]}>
                        {format(new Date(game.scheduledAt), 'MMM d')}
                      </Text>
                      <Text style={[styles.gameTime, { color: colors.textMuted }]}>
                        {format(new Date(game.scheduledAt), 'h:mm a')}
                      </Text>
                    </>
                  )}
                </View>
                <View style={styles.gameCardCenter}>
                  <Text style={[styles.gameTeams, { color: colors.textPrimary }]} numberOfLines={1}>
                    {game.homeTeam?.name ?? 'TBD'} vs {game.awayTeam?.name ?? 'TBD'}
                  </Text>
                  {game.event?.name && (
                    <Text style={[styles.gameCourt, { color: colors.textMuted }]}>{game.event.name}</Text>
                  )}
                </View>
                <View style={styles.gameCardChevron}>
                  <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyCardDesc, { color: colors.textMuted }]}>No upcoming games scheduled</Text>
          </View>
        )}
      </View>

      {/* ── COLLEGE RECRUITING ──────────────────────────────── */}
      {allPlayers.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.recruitingCard, { backgroundColor: colors.surface, borderColor: colors.gold + '30' }]}>
            {/* Gold accent top bar */}
            <View style={[styles.recruitingAccent, { backgroundColor: colors.gold }]} />

            {/* Header */}
            <View style={[styles.recruitingHeader, { borderBottomColor: colors.gold + '15' }]}>
              <View>
                <Text style={[styles.recruitingTitle, { color: colors.gold }]}>COLLEGE RECRUITING</Text>
                <Text style={[styles.recruitingDesc, { color: colors.textMuted }]}>
                  Send your profile directly to college coaches
                </Text>
              </View>
              <View style={[styles.premiumBadge, { backgroundColor: colors.gold + '15', borderColor: colors.gold + '30' }]}>
                <Text style={[styles.premiumBadgeText, { color: colors.gold }]}>PREMIUM</Text>
              </View>
            </View>

            {/* Player rows with Email Coaches button */}
            {allPlayers.map((p) => (
              <View key={p.id} style={[styles.recruitingPlayerRow, { borderBottomColor: colors.border }]}>
                <View style={styles.recruitingPlayerInfo}>
                  {(p.profilePhoto ?? p.profileImageUrl) ? (
                    <Image
                      source={{ uri: (p.profilePhoto ?? p.profileImageUrl)! }}
                      style={[styles.recruitingPlayerAvatar, { backgroundColor: colors.surfaceLight }]}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.recruitingPlayerAvatarFallback, { backgroundColor: colors.surfaceLight }]}>
                      <Text style={[styles.recruitingPlayerInitial, { color: colors.textPrimary }]}>
                        {(p.firstName?.[0] ?? '').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={[styles.recruitingPlayerName, { color: colors.textPrimary }]}>
                      {p.firstName} {p.lastName}
                    </Text>
                    <Text style={[styles.recruitingPlayerMeta, { color: colors.textMuted }]}>
                      {p.graduationYear ? `Class of ${p.graduationYear}` : 'No grad year'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.emailCoachesBtn, { backgroundColor: colors.gold }]}
                  onPress={() =>
                    router.push({
                      pathname: '/recruiting',
                      params: {
                        playerSlugs: p.slug,
                        playerName: `${p.firstName} ${p.lastName}`,
                      },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Text style={[styles.emailCoachesBtnText, { color: colors.textInverse }]}>Email Coaches</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Email Log */}
            <View style={[styles.recruitingLogSection, { borderTopColor: colors.gold + '15' }]}>
              <Text style={[styles.recruitingLogTitle, { color: colors.textMuted }]}>SENT EMAILS</Text>
              {(!emailLog || emailLog.length === 0) ? (
                <Text style={[styles.recruitingLogEmpty, { color: colors.textMuted }]}>
                  No emails sent yet. Start by emailing a college coach above.
                </Text>
              ) : (
                <View style={styles.recruitingLogList}>
                  {emailLog.slice(0, 5).map((log: RecruitingEmailLog) => (
                    <View key={log.id} style={[styles.recruitingLogRow, { backgroundColor: colors.surfaceLight + '40', borderColor: colors.border }]}>
                      <View style={styles.recruitingLogInfo}>
                        <Text style={[styles.recruitingLogCoach, { color: colors.textPrimary }]} numberOfLines={1}>
                          {log.coachName}
                        </Text>
                        <Text style={[styles.recruitingLogCollege, { color: colors.textMuted }]} numberOfLines={1}>
                          {log.collegeName}
                        </Text>
                      </View>
                      <Text style={[styles.recruitingLogDate, { color: colors.textMuted }]}>
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
        <Pressable style={[styles.notifOverlay, { backgroundColor: colors.modalBackdrop }]} onPress={() => setShowNotifPanel(false)}>
          <Pressable style={[styles.notifPanel, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.notifHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.notifTitle, { color: colors.textMuted }]}>NOTIFICATIONS</Text>
              <TouchableOpacity onPress={() => setShowNotifPanel(false)} style={[styles.notifClose, { backgroundColor: colors.inputOverlay }]}>
                <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 12, height: 1.8, backgroundColor: colors.textSecondary, borderRadius: 1, transform: [{ rotate: '45deg' }], position: 'absolute' }} />
                  <View style={{ width: 12, height: 1.8, backgroundColor: colors.textSecondary, borderRadius: 1, transform: [{ rotate: '-45deg' }], position: 'absolute' }} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.notifLabel, { color: colors.textPrimary }]}>New Game Added</Text>
                <Text style={[styles.notifDesc, { color: colors.textMuted }]}>When a new game is scheduled</Text>
              </View>
              <Switch
                value={notifPrefs.newGame}
                onValueChange={() => toggleNotifPref('newGame')}
                trackColor={{ false: colors.surfaceLight, true: colors.red }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.notifRow, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.notifLabel, { color: colors.textPrimary }]}>Schedule Change</Text>
                <Text style={[styles.notifDesc, { color: colors.textMuted }]}>Time or date updates</Text>
              </View>
              <Switch
                value={notifPrefs.scheduleChange}
                onValueChange={() => toggleNotifPref('scheduleChange')}
                trackColor={{ false: colors.surfaceLight, true: colors.red }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.notifRow, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={[styles.notifLabel, { color: colors.textPrimary }]}>Game Update</Text>
                <Text style={[styles.notifDesc, { color: colors.textMuted }]}>Score or status changes</Text>
              </View>
              <Switch
                value={notifPrefs.gameChange}
                onValueChange={() => toggleNotifPref('gameChange')}
                trackColor={{ false: colors.surfaceLight, true: colors.red }}
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
  },
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
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
  headerName: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.headingBlack,
    marginTop: -1,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Welcome
  welcomeSection: {
    marginBottom: Spacing.xl,
  },
  welcomeText: {
    fontSize: FontSize.xxxl,
    fontFamily: Fonts.headingBlack,
  },
  welcomeSubtext: {
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
    marginTop: Spacing.xs,
  },

  // Player Card
  playerCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
  },
  playerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  playerPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  playerPhotoFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInitials: {
    fontSize: FontSize.xl,
    fontFamily: Fonts.headingBlack,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
  },
  playerMeta: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    marginTop: 2,
  },

  // Stats row inside player card
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    marginHorizontal: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: Fonts.headingBlack,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    marginTop: 4,
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
  },

  // View Profile
  viewProfileBtn: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  viewProfileBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },

  // Section
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.heading,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  liveHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Empty card
  emptyCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyCardTitle: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
    marginBottom: Spacing.sm,
  },
  emptyCardDesc: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Game Cards
  gamesList: {
    gap: Spacing.sm,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  gameCardLeft: {
    width: 52,
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  gameDate: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.headingSemiBold,
  },
  gameTime: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  gameCardCenter: {
    flex: 1,
  },
  gameTeams: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
  },
  gameCourt: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  gameCardChevron: {
    marginLeft: Spacing.sm,
  },
  chevron: {
    fontSize: FontSize.xxl,
  },

  // Recruiting Card
  recruitingCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  recruitingAccent: {
    height: 3,
  },
  recruitingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  recruitingTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingBlack,
    letterSpacing: 2,
  },
  recruitingDesc: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 4,
  },
  premiumBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.headingBlack,
    letterSpacing: 1.5,
  },
  recruitingPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
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
  },
  recruitingPlayerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recruitingPlayerInitial: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.heading,
  },
  recruitingPlayerName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },
  recruitingPlayerMeta: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emailCoachesBtn: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  emailCoachesBtnText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
  },
  recruitingLogSection: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  recruitingLogTitle: {
    fontSize: 10,
    fontFamily: Fonts.headingBlack,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  recruitingLogEmpty: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
  },
  recruitingLogList: {
    gap: Spacing.sm,
  },
  recruitingLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
  },
  recruitingLogInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  recruitingLogCoach: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
  },
  recruitingLogCollege: {
    fontSize: 10,
    fontFamily: Fonts.body,
  },
  recruitingLogDate: {
    fontSize: 10,
    fontFamily: Fonts.body,
  },

  // Notification Panel
  notifOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingRight: Spacing.lg,
  },
  notifPanel: {
    width: 260,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  notifTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingBlack,
    letterSpacing: 1.5,
  },
  notifClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  },
  notifLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },
  notifDesc: {
    fontSize: 10,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
});
