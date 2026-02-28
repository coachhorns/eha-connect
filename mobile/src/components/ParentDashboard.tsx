import React, { useEffect, useCallback, useRef, useState } from 'react';
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
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { playersApi } from '@/api/players';
import { eventsApi } from '@/api/events';
import { recruitingApi } from '@/api/recruiting';
import { subscriptionApi } from '@/api/subscription';
import { guardiansApi } from '@/api/guardians';
import { Loading } from '@/components/ui/Loading';
import type { GuardedPlayer, Player, RecruitingEmailLog } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 80;
const PLAYER_CARD_WIDTH = SCREEN_WIDTH - 80;

// ── Main Component ─────────────────────────────────────────────

export function ParentDashboard() {
  const { user, signOut } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const firstName = user?.name?.split(' ')[0] ?? 'Parent';

  // Tab press → scroll to top
  useEffect(() => {
    const unsub = navigation.addListener('tabPress' as any, () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return unsub;
  }, [navigation]);

  // ── Notification Preferences ───────────────────────────────
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
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
          Alert.alert('Permissions Required', 'Enable notifications in your device settings.');
          return;
        }
      }
    }
    const updated = { ...notifPrefs, [key]: turningOn };
    setNotifPrefs(updated);
    await SecureStore.setItemAsync('notifPrefs', JSON.stringify(updated));
  }, [notifPrefs]);

  // ── Invite Co-Parent Sheet ─────────────────────────────────
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePlayerId, setInvitePlayerId] = useState<string | null>(null);
  const [inviteType, setInviteType] = useState<'PARENT' | 'PLAYER'>('PARENT');

  const inviteMutation = useMutation({
    mutationFn: (data: { playerId: string; email: string; type: 'PARENT' | 'PLAYER' }) =>
      guardiansApi.sendInvite(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['guardianInvites'] });
      setShowInviteSheet(false);
      setInviteEmail('');
      setInvitePlayerId(null);
      setInviteType('PARENT');
      Alert.alert('Invite Sent', res.message);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message ?? 'Failed to send invite');
    },
  });

  // ── Data Fetching ──────────────────────────────────────────
  const { data: guardedPlayers, refetch: refetchGuarded, isLoading: playersLoading } = useQuery({
    queryKey: ['guardedPlayers'],
    queryFn: playersApi.getGuardedPlayers,
  });

  const players = guardedPlayers ?? [];

  // Full profile per player (for career stats)
  const playerDetailQueries = useQueries({
    queries: players.map((p) => ({
      queryKey: ['playerFull', p.slug],
      queryFn: () => playersApi.getBySlug(p.slug),
      enabled: !!p.slug,
      staleTime: 30_000,
    })),
  });

  // Upcoming games per player
  const upcomingGamesQueries = useQueries({
    queries: players.map((p) => ({
      queryKey: ['upcomingGames', p.id],
      queryFn: () => playersApi.getUpcomingGames(p.id),
      enabled: !!p.id,
      staleTime: 30_000,
    })),
  });

  const { data: emailLog, refetch: refetchEmailLog } = useQuery({
    queryKey: ['emailLog'],
    queryFn: recruitingApi.getEmailLog,
  });

  const { data: subscriptionData, refetch: refetchSubscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getStatus,
    retry: false,
  });

  const { data: pendingInvites, refetch: refetchInvites } = useQuery({
    queryKey: ['guardianInvites'],
    queryFn: guardiansApi.getPendingInvites,
    retry: false,
  });

  // Aggregate upcoming games across all players
  const allUpcomingGames = players.flatMap((p, idx) => {
    const games = upcomingGamesQueries[idx]?.data ?? [];
    return games.map((g: any) => ({
      ...g,
      playerName: `${p.firstName} ${p.lastName}`,
    }));
  }).sort((a: any, b: any) => {
    if (!a.scheduledTime || !b.scheduledTime) return 0;
    return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
  }).slice(0, 5);

  // ── Pull to Refresh ────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchGuarded(),
      refetchEmailLog(),
      refetchSubscription(),
      refetchInvites(),
      ...playerDetailQueries.map((q) => q.refetch()),
      ...upcomingGamesQueries.map((q) => q.refetch()),
    ]);
    setRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  if (playersLoading) {
    return <Loading message="Loading..." />;
  }

  // Extract subscription from wrapped response
  const subscription = (subscriptionData as any)?.subscription ?? subscriptionData;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── FROSTED GLASS HEADER ─────────────────────────────── */}
      <View style={[styles.stickyHeader, { height: HEADER_HEIGHT }]}>
        <BlurView intensity={80} tint={colors.glassTint} style={StyleSheet.absoluteFill}>
          <View style={[styles.headerInner, { paddingTop: Platform.OS === 'ios' ? 50 : 30, backgroundColor: colors.headerOverlay }]}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/eha-connect-logo.png')}
                style={styles.headerLogo}
                contentFit="contain"
              />
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Parent Dashboard</Text>
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
        {/* ── WELCOME ────────────────────────────────────────── */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeGreeting, { color: colors.textPrimary }]}>
            Hi, {firstName}
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textMuted }]}>
            Managing {players.length} Athlete{players.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* ── PLAYER CARDS ───────────────────────────────────── */}
        {players.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>YOUR ATHLETES</Text>
            {players.length > 1 ? (
              <FlatList
                data={players}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={PLAYER_CARD_WIDTH + Spacing.md}
                decelerationRate="fast"
                contentContainerStyle={{ paddingRight: Spacing.xl }}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <PlayerCard
                    player={item}
                    detail={playerDetailQueries[index]?.data}
                    colors={colors}
                    router={router}
                    isWide
                  />
                )}
              />
            ) : (
              <PlayerCard
                player={players[0]}
                detail={playerDetailQueries[0]?.data}
                colors={colors}
                router={router}
                isWide={false}
              />
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyCardTitle, { color: colors.textPrimary }]}>No Players Linked</Text>
              <Text style={[styles.emptyCardDesc, { color: colors.textMuted }]}>
                Your athletes will appear here once they're linked to your account.
              </Text>
            </View>
          </View>
        )}

        {/* ── UPCOMING GAMES ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>UPCOMING GAMES</Text>
          {allUpcomingGames.length > 0 ? (
            <View style={styles.gamesList}>
              {allUpcomingGames.map((game: any, idx: number) => (
                <View key={game.id ?? idx} style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.gameCardLeft}>
                    {game.scheduledTime && (
                      <>
                        <Text style={[styles.gameDate, { color: colors.red }]}>
                          {format(new Date(game.scheduledTime), 'MMM d')}
                        </Text>
                        <Text style={[styles.gameTime, { color: colors.textMuted }]}>
                          {format(new Date(game.scheduledTime), 'h:mm a')}
                        </Text>
                      </>
                    )}
                  </View>
                  <View style={styles.gameCardCenter}>
                    <Text style={[styles.gamePlayerLabel, { color: colors.gold }]}>
                      {game.playerName}
                    </Text>
                    <Text style={[styles.gameTeams, { color: colors.textPrimary }]} numberOfLines={1}>
                      {game.homeTeam?.name ?? 'TBD'} vs {game.awayTeam?.name ?? 'TBD'}
                    </Text>
                    {game.court && (
                      <Text style={[styles.gameCourt, { color: colors.textMuted }]}>{game.court}</Text>
                    )}
                  </View>
                  <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyCardDesc, { color: colors.textMuted }]}>No upcoming games scheduled</Text>
            </View>
          )}
        </View>

        {/* ── RECRUITING ─────────────────────────────────────── */}
        {players.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.recruitingCard, { backgroundColor: colors.surface, borderColor: colors.gold + '30' }]}>
              <View style={[styles.recruitingAccent, { backgroundColor: colors.gold }]} />
              <View style={[styles.recruitingHeader, { borderBottomColor: colors.gold + '15' }]}>
                <View>
                  <Text style={[styles.recruitingTitle, { color: colors.gold }]}>COLLEGE RECRUITING</Text>
                  <Text style={[styles.recruitingDesc, { color: colors.textMuted }]}>
                    Send profiles directly to college coaches
                  </Text>
                </View>
                <View style={[styles.premiumBadge, { backgroundColor: colors.gold + '15', borderColor: colors.gold + '30' }]}>
                  <Text style={[styles.premiumBadgeText, { color: colors.gold }]}>PREMIUM</Text>
                </View>
              </View>

              {players.map((player) => (
                <View key={player.id} style={[styles.recruitingPlayerRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.recruitingPlayerInfo}>
                    {(player.profilePhoto ?? player.profileImageUrl) ? (
                      <Image
                        source={{ uri: (player.profilePhoto ?? player.profileImageUrl)! }}
                        style={[styles.avatar, { backgroundColor: colors.surfaceLight }]}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.avatarFallback, { backgroundColor: colors.surfaceLight }]}>
                        <Text style={[styles.avatarInitial, { color: colors.textPrimary }]}>
                          {(player.firstName?.[0] ?? '').toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recruitingPlayerName, { color: colors.textPrimary }]}>
                        {player.firstName} {player.lastName}
                      </Text>
                      <Text style={[styles.recruitingPlayerMeta, { color: colors.textMuted }]}>
                        {emailLog?.filter((l: RecruitingEmailLog) =>
                          l.players?.some((p) => p.firstName === player.firstName && p.lastName === player.lastName)
                        ).length ?? 0} emails sent
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.emailCoachesBtn, { backgroundColor: colors.gold }]}
                    onPress={() => router.push({
                      pathname: '/recruiting',
                      params: {
                        playerSlugs: player.slug,
                        playerName: `${player.firstName} ${player.lastName}`,
                      },
                    })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.emailCoachesBtnText, { color: colors.textInverse }]}>Email Coaches</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Recent emails */}
              <View style={[styles.recruitingLogSection, { borderTopColor: colors.gold + '15' }]}>
                <Text style={[styles.logTitle, { color: colors.textMuted }]}>RECENT EMAILS</Text>
                {(!emailLog || emailLog.length === 0) ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No emails sent yet
                  </Text>
                ) : (
                  <View style={styles.logList}>
                    {emailLog.slice(0, 3).map((log: RecruitingEmailLog) => (
                      <View key={log.id} style={[styles.logRow, { backgroundColor: colors.surfaceLight + '40', borderColor: colors.border }]}>
                        <View style={{ flex: 1, marginRight: Spacing.md }}>
                          <Text style={[styles.logCoach, { color: colors.textPrimary }]} numberOfLines={1}>
                            {log.coachName}
                          </Text>
                          <Text style={[styles.logCollege, { color: colors.textMuted }]} numberOfLines={1}>
                            {log.collegeName}
                          </Text>
                        </View>
                        <Text style={[styles.logDate, { color: colors.textMuted }]}>
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

        {/* ── SUBSCRIPTION ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SUBSCRIPTION</Text>
          <View style={[styles.subscriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.subscriptionRow}>
              <View>
                <Text style={[styles.subscriptionPlan, { color: colors.textPrimary }]}>
                  {subscription?.plan
                    ? subscription.plan.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                    : 'Free'}
                </Text>
                <View style={styles.subscriptionStatusRow}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: subscription?.status === 'ACTIVE' ? colors.success : colors.error },
                  ]} />
                  <Text style={[styles.subscriptionStatus, { color: colors.textMuted }]}>
                    {subscription?.status ?? 'No active plan'}
                  </Text>
                </View>
                {subscription?.currentPeriodEnd && (
                  <Text style={[styles.subscriptionExpiry, { color: colors.textMuted }]}>
                    Renews {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.manageBtn, { backgroundColor: colors.red }]}
                onPress={() => router.push('/(tabs)/more')}
                activeOpacity={0.7}
              >
                <Text style={[styles.manageBtnText, { color: '#fff' }]}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── FAMILY MANAGEMENT ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>FAMILY</Text>
          <View style={[styles.familyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>

            {/* Guardians per player */}
            {players.map((player, idx) => {
              const detail = playerDetailQueries[idx]?.data;
              const detailLoading = playerDetailQueries[idx]?.isLoading;
              const allGuardians = detail?.guardians ?? player.guardians ?? [];
              const parentGuardians = allGuardians.filter((g) => g.role !== 'PLAYER');
              const playerGuardian = allGuardians.find((g) => g.role === 'PLAYER');
              const isClaimed = !!playerGuardian || !!detail?.userId;

              return (
                <View key={player.id} style={[styles.familyPlayerSection, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.familyPlayerName, { color: colors.textPrimary }]}>
                    {player.firstName} {player.lastName}
                  </Text>

                  {/* Athlete claim status */}
                  {detailLoading ? (
                    <View style={[styles.claimedRow]}>
                      <ActivityIndicator size="small" color={colors.textMuted} />
                    </View>
                  ) : isClaimed ? (
                    <View style={[styles.claimedRow]}>
                      <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                      <Text style={[styles.claimedText, { color: colors.textMuted }]}>
                        Athlete account linked
                        {playerGuardian?.user?.name ? ` · ${playerGuardian.user.name}` : ''}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.inviteAthleteRow}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setInvitePlayerId(player.id);
                        setInviteType('PLAYER');
                        setShowInviteSheet(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.inviteAthleteText, { color: colors.gold }]}>
                        + Invite Athlete to Claim Profile
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Parent guardians */}
                  {parentGuardians.length > 0 && (
                    <View style={styles.guardianList}>
                      {parentGuardians.map((g, gIdx) => (
                        <View key={gIdx} style={styles.guardianRow}>
                          <PersonIcon color={colors.textMuted} />
                          <Text style={[styles.guardianName, { color: colors.textSecondary }]}>
                            {g.user.name ?? g.user.email ?? 'Unknown'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Pending invites */}
            {pendingInvites && pendingInvites.length > 0 && (
              <View style={[styles.pendingSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.pendingTitle, { color: colors.textMuted }]}>PENDING INVITES</Text>
                {pendingInvites.map((invite) => (
                  <View key={invite.id} style={[styles.pendingRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pendingEmail, { color: colors.textPrimary }]}>{invite.email}</Text>
                      <Text style={[styles.pendingPlayer, { color: colors.textMuted }]}>
                        for {invite.player.firstName} {invite.player.lastName}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Cancel Invite', `Cancel invite to ${invite.email}?`, [
                          { text: 'Keep', style: 'cancel' },
                          {
                            text: 'Cancel Invite', style: 'destructive',
                            onPress: async () => {
                              try {
                                await guardiansApi.cancelInvite(invite.id);
                                refetchInvites();
                              } catch {
                                Alert.alert('Error', 'Failed to cancel invite');
                              }
                            },
                          },
                        ]);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cancelText, { color: colors.error }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Invite button */}
            <TouchableOpacity
              style={[styles.inviteBtn, { borderTopColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setInviteType('PARENT');
                if (players.length === 1) {
                  setInvitePlayerId(players[0].id);
                }
                setShowInviteSheet(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.inviteBtnText, { color: colors.red }]}>+ Invite Co-Parent</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SIGN OUT ───────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.6}
        >
          <Text style={[styles.signOutText, { color: colors.textMuted }]}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── NOTIFICATION PANEL ────────────────────────────────── */}
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
            {(['newGame', 'scheduleChange', 'gameChange'] as const).map((key, idx) => (
              <View key={key} style={[styles.notifRow, { borderBottomColor: colors.border, borderBottomWidth: idx === 2 ? 0 : 1 }]}>
                <View>
                  <Text style={[styles.notifLabel, { color: colors.textPrimary }]}>
                    {key === 'newGame' ? 'New Game Added' : key === 'scheduleChange' ? 'Schedule Change' : 'Game Update'}
                  </Text>
                  <Text style={[styles.notifDesc, { color: colors.textMuted }]}>
                    {key === 'newGame' ? 'When a new game is scheduled' : key === 'scheduleChange' ? 'Time or date updates' : 'Score or status changes'}
                  </Text>
                </View>
                <Switch
                  value={notifPrefs[key]}
                  onValueChange={() => toggleNotifPref(key)}
                  trackColor={{ false: colors.surfaceLight, true: colors.red }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── INVITE CO-PARENT MODAL ────────────────────────────── */}
      <Modal
        visible={showInviteSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteSheet(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable
            style={[styles.sheetOverlay, { backgroundColor: colors.modalBackdrop }]}
            onPress={() => setShowInviteSheet(false)}
          >
            <Pressable
              style={[styles.sheetContent, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.sheetHandle, { backgroundColor: colors.surfaceLight }]} />
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                {inviteType === 'PLAYER' ? 'Invite Athlete' : 'Invite Co-Parent'}
              </Text>
              <Text style={[styles.sheetDesc, { color: colors.textMuted }]}>
                {inviteType === 'PLAYER'
                  ? 'Send an invite so your athlete can claim and manage their own profile.'
                  : 'Send an invite so another parent can manage your athlete\'s profile.'}
              </Text>

              {/* Player selector (multi-child) */}
              {players.length > 1 && (
                <View style={styles.playerSelector}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>FOR PLAYER</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerChips}>
                    {players.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.playerChip,
                          {
                            backgroundColor: invitePlayerId === p.id ? colors.red + '15' : colors.surfaceLight,
                            borderColor: invitePlayerId === p.id ? colors.red : colors.border,
                          },
                        ]}
                        onPress={() => setInvitePlayerId(p.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.playerChipText,
                          { color: invitePlayerId === p.id ? colors.red : colors.textPrimary },
                        ]}>
                          {p.firstName} {p.lastName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>EMAIL ADDRESS</Text>
                <TextInput
                  style={[styles.textInput, {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                  }]}
                  placeholder="parent@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.sendInviteBtn,
                  {
                    backgroundColor: invitePlayerId && inviteEmail.includes('@') ? colors.red : colors.surfaceLight,
                    opacity: invitePlayerId && inviteEmail.includes('@') ? 1 : 0.5,
                  },
                ]}
                onPress={() => {
                  if (!invitePlayerId || !inviteEmail.includes('@')) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  inviteMutation.mutate({ playerId: invitePlayerId, email: inviteEmail, type: inviteType });
                }}
                disabled={!invitePlayerId || !inviteEmail.includes('@') || inviteMutation.isPending}
                activeOpacity={0.7}
              >
                {inviteMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.sendInviteBtnText, { color: '#fff' }]}>Send Invite</Text>
                )}
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Player Card Sub-Component ──────────────────────────────────

function PlayerCard({
  player,
  detail,
  colors,
  router,
  isWide,
}: {
  player: GuardedPlayer;
  detail: Player | undefined;
  colors: any;
  router: any;
  isWide: boolean;
}) {
  const photoUri = player.profilePhoto ?? player.profileImageUrl;
  const stats = detail?.careerStats?.averages;
  const teamName = player.teamRosters?.[0]?.team?.name;

  return (
    <View style={[
      styles.playerCard,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        width: isWide ? PLAYER_CARD_WIDTH : '100%',
        marginRight: isWide ? Spacing.md : 0,
      },
    ]}>
      {/* Top row: avatar + info + role badge */}
      <View style={styles.playerCardHeader}>
        <TouchableOpacity
          style={styles.playerCardHeaderContent}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={[styles.playerCardAvatar, { backgroundColor: colors.surfaceLight }]}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.playerCardAvatarFallback, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.playerCardInitial, { color: colors.textPrimary }]}>
                {(player.firstName?.[0] ?? '').toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.playerCardName, { color: colors.textPrimary }]}>
              {player.firstName} {player.lastName}
            </Text>
            <Text style={[styles.playerCardMeta, { color: colors.textMuted }]}>
              {[
                teamName,
                player.graduationYear ? `Class of ${player.graduationYear}` : null,
                player.primaryPosition,
              ].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={[styles.playerStatsRow, { borderTopColor: colors.border }]}>
        <View style={styles.playerStatItem}>
          <Text style={[styles.playerStatValue, { color: colors.textPrimary }]}>
            {stats?.ppg != null ? stats.ppg.toFixed(1) : '—'}
          </Text>
          <Text style={[styles.playerStatLabel, { color: colors.textMuted }]}>PPG</Text>
        </View>
        <View style={[styles.playerStatDivider, { backgroundColor: colors.border }]} />
        <View style={styles.playerStatItem}>
          <Text style={[styles.playerStatValue, { color: colors.textPrimary }]}>
            {stats?.rpg != null ? stats.rpg.toFixed(1) : '—'}
          </Text>
          <Text style={[styles.playerStatLabel, { color: colors.textMuted }]}>RPG</Text>
        </View>
        <View style={[styles.playerStatDivider, { backgroundColor: colors.border }]} />
        <View style={styles.playerStatItem}>
          <Text style={[styles.playerStatValue, { color: colors.textPrimary }]}>
            {stats?.apg != null ? stats.apg.toFixed(1) : '—'}
          </Text>
          <Text style={[styles.playerStatLabel, { color: colors.textMuted }]}>APG</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.playerCardActions}>
        <TouchableOpacity
          style={[styles.viewProfileBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewProfileBtnText, { color: colors.textPrimary }]}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Inline SVG Icons ───────────────────────────────────────────

function PersonIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: color }} />
      <View style={{ width: 10, height: 5, borderTopLeftRadius: 5, borderTopRightRadius: 5, borderWidth: 1.5, borderColor: color, borderBottomWidth: 0, marginTop: 1 }} />
    </View>
  );
}

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

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },

  // Header
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  headerInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg },
  headerBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerLogo: { width: 72, height: 72 },
  headerTitle: { fontSize: FontSize.lg, fontFamily: Fonts.headingBlack, marginTop: -1 },
  bellButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Welcome
  welcomeSection: { marginBottom: Spacing.xxl },
  welcomeGreeting: { fontSize: FontSize.xxxl, fontFamily: Fonts.headingBlack },
  welcomeSubtitle: { fontSize: FontSize.md, fontFamily: Fonts.bodyMedium, marginTop: Spacing.xs },

  // Section
  section: { marginBottom: Spacing.xxl },
  sectionTitle: { fontSize: FontSize.xs, fontFamily: Fonts.headingBlack, letterSpacing: 1.5, marginBottom: Spacing.lg, textTransform: 'uppercase' },

  // Player Card
  playerCard: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  playerCardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.lg, gap: Spacing.md },
  playerCardHeaderContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.md },
  playerCardAvatar: { width: 52, height: 52, borderRadius: 26 },
  playerCardAvatarFallback: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  playerCardInitial: { fontSize: FontSize.xl, fontFamily: Fonts.heading },
  playerCardName: { fontSize: FontSize.lg, fontFamily: Fonts.heading },
  playerCardMeta: { fontSize: FontSize.xs, fontFamily: Fonts.body, marginTop: 2 },
  roleBadge: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  roleBadgeText: { fontSize: 9, fontFamily: Fonts.headingBlack, letterSpacing: 1 },

  // Player Stats Row
  playerStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: Spacing.md, borderTopWidth: 1, marginHorizontal: Spacing.lg },
  playerStatItem: { flex: 1, alignItems: 'center' },
  playerStatValue: { fontSize: 22, fontFamily: Fonts.headingBlack },
  playerStatLabel: { fontSize: FontSize.xs, fontFamily: Fonts.bodySemiBold, marginTop: 2, letterSpacing: 1 },
  playerStatDivider: { width: 1, height: 28 },

  // Player Card Actions
  playerCardActions: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, paddingTop: Spacing.sm },
  viewProfileBtn: { flex: 1, borderRadius: BorderRadius.sm, paddingVertical: Spacing.sm, alignItems: 'center' },
  viewProfileBtnText: { fontSize: FontSize.sm, fontFamily: Fonts.bodySemiBold },

  // Games
  gamesList: { gap: Spacing.sm },
  gameCard: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1 },
  gameCardLeft: { width: 52, alignItems: 'center', marginRight: Spacing.lg },
  gameDate: { fontSize: FontSize.sm, fontFamily: Fonts.headingSemiBold },
  gameTime: { fontSize: FontSize.xs, fontFamily: Fonts.body, marginTop: 2 },
  gameCardCenter: { flex: 1 },
  gamePlayerLabel: { fontSize: 10, fontFamily: Fonts.headingBlack, letterSpacing: 1, marginBottom: 2, textTransform: 'uppercase' },
  gameTeams: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold },
  gameCourt: { fontSize: FontSize.xs, fontFamily: Fonts.body, marginTop: 2 },
  chevron: { fontSize: FontSize.xxl, fontWeight: '300', marginLeft: Spacing.sm },

  // Recruiting
  recruitingCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1 },
  recruitingAccent: { height: 3 },
  recruitingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.lg, borderBottomWidth: 1 },
  recruitingTitle: { fontSize: FontSize.xs, fontFamily: Fonts.headingBlack, letterSpacing: 2 },
  recruitingDesc: { fontSize: FontSize.xs, fontFamily: Fonts.body, marginTop: 4 },
  premiumBadge: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 3 },
  premiumBadgeText: { fontSize: 9, fontFamily: Fonts.headingBlack, letterSpacing: 1.5 },
  recruitingPlayerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  recruitingPlayerInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  recruitingPlayerName: { fontSize: FontSize.sm, fontFamily: Fonts.bodySemiBold },
  recruitingPlayerMeta: { fontSize: 10, fontFamily: Fonts.body, marginTop: 2 },
  emailCoachesBtn: { borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  emailCoachesBtnText: { fontSize: FontSize.xs, fontFamily: Fonts.bodySemiBold },
  recruitingLogSection: { padding: Spacing.lg, borderTopWidth: 1 },
  logTitle: { fontSize: 10, fontFamily: Fonts.headingBlack, letterSpacing: 2, marginBottom: Spacing.sm },
  logList: { gap: Spacing.sm },
  logRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1 },
  logCoach: { fontSize: FontSize.xs, fontFamily: Fonts.bodyMedium },
  logCollege: { fontSize: 10, fontFamily: Fonts.body },
  logDate: { fontSize: 10, fontFamily: Fonts.body },
  emptyText: { fontSize: FontSize.xs, fontFamily: Fonts.body },

  // Avatar shared
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: FontSize.sm, fontFamily: Fonts.heading },

  // Subscription
  subscriptionCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1 },
  subscriptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subscriptionPlan: { fontSize: FontSize.lg, fontFamily: Fonts.heading },
  subscriptionStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  subscriptionStatus: { fontSize: FontSize.sm, fontFamily: Fonts.body, textTransform: 'capitalize' },
  subscriptionExpiry: { fontSize: FontSize.xs, fontFamily: Fonts.body, marginTop: 4 },
  manageBtn: { borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  manageBtnText: { fontSize: FontSize.sm, fontFamily: Fonts.bodySemiBold },

  // Family Management
  familyCard: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  familyPlayerSection: { padding: Spacing.lg, borderBottomWidth: 1 },
  familyPlayerName: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold },
  guardianRoleBadge: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  guardianRoleText: { fontSize: 9, fontFamily: Fonts.headingBlack, letterSpacing: 1 },
  claimedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  claimedText: { fontSize: FontSize.xs, fontFamily: Fonts.body },
  inviteAthleteRow: { marginTop: Spacing.sm },
  inviteAthleteText: { fontSize: FontSize.sm, fontFamily: Fonts.bodySemiBold },
  guardianList: { marginTop: Spacing.sm, gap: 4 },
  guardianRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guardianName: { fontSize: FontSize.xs, fontFamily: Fonts.body },
  pendingSection: { padding: Spacing.lg, borderTopWidth: 1 },
  pendingTitle: { fontSize: 10, fontFamily: Fonts.headingBlack, letterSpacing: 2, marginBottom: Spacing.sm },
  pendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  pendingEmail: { fontSize: FontSize.sm, fontFamily: Fonts.bodySemiBold },
  pendingPlayer: { fontSize: FontSize.xs, fontFamily: Fonts.body, marginTop: 2 },
  cancelText: { fontSize: FontSize.xs, fontFamily: Fonts.bodySemiBold },
  inviteBtn: { padding: Spacing.lg, borderTopWidth: 1, alignItems: 'center' },
  inviteBtnText: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold },

  // Empty state
  emptyCard: { borderRadius: BorderRadius.lg, padding: Spacing.xxl, alignItems: 'center', borderWidth: 1 },
  emptyCardTitle: { fontSize: FontSize.lg, fontFamily: Fonts.heading, marginBottom: Spacing.sm },
  emptyCardDesc: { fontSize: FontSize.sm, fontFamily: Fonts.body, textAlign: 'center', lineHeight: 20 },

  // Sign Out
  signOutButton: { alignSelf: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, marginTop: Spacing.md },
  signOutText: { fontSize: FontSize.xs, fontFamily: Fonts.body },

  // Notification Panel
  notifOverlay: { flex: 1, justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: Platform.OS === 'ios' ? 100 : 80, paddingRight: Spacing.lg },
  notifPanel: { width: 260, borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  notifTitle: { fontSize: FontSize.xs, fontFamily: Fonts.headingBlack, letterSpacing: 1.5 },
  notifClose: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  notifLabel: { fontSize: FontSize.sm, fontFamily: Fonts.bodySemiBold },
  notifDesc: { fontSize: 10, fontFamily: Fonts.body, marginTop: 2 },

  // Invite Sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetContent: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xxl },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: Spacing.md, marginBottom: Spacing.xl },
  sheetTitle: { fontSize: FontSize.xl, fontFamily: Fonts.heading, marginBottom: Spacing.sm },
  sheetDesc: { fontSize: FontSize.sm, fontFamily: Fonts.body, marginBottom: Spacing.xl, lineHeight: 20 },
  playerSelector: { marginBottom: Spacing.xl },
  playerChips: { marginTop: Spacing.sm },
  playerChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginRight: Spacing.sm },
  playerChipText: { fontSize: FontSize.sm, fontFamily: Fonts.bodySemiBold },
  inputGroup: { marginBottom: Spacing.xl },
  inputLabel: { fontSize: 10, fontFamily: Fonts.headingBlack, letterSpacing: 2, marginBottom: Spacing.sm },
  textInput: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, fontFamily: Fonts.body },
  sendInviteBtn: { borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', marginBottom: Spacing.md },
  sendInviteBtnText: { fontSize: FontSize.md, fontFamily: Fonts.bodySemiBold },
});
