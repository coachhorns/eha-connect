import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { leaderboardsApi } from '@/api/leaderboards';
import { playersApi } from '@/api/players';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import type { LeaderboardEntry, Player, EventStandingEntry } from '@/types';

// ── Types ─────────────────────────────────────────────────────
type Segment = 'mystats' | 'leaderboards' | 'standings';
type StatsMode = 'avg' | 'total';
type StatCategory = 'ppg' | 'rpg' | 'apg' | 'spg' | 'bpg' | 'fgPct';

// ── Constants ─────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 152 : 132;
const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

const STAT_CATS: {
  key: StatCategory;
  label: string;
  short: string;
  avgField: keyof any;
  totalField: keyof any;
  pct?: boolean;
}[] = [
  { key: 'ppg', label: 'Points',   short: 'PTS', avgField: 'ppg',  totalField: 'points'   },
  { key: 'rpg', label: 'Rebounds', short: 'REB', avgField: 'rpg',  totalField: 'rebounds' },
  { key: 'apg', label: 'Assists',  short: 'AST', avgField: 'apg',  totalField: 'assists'  },
  { key: 'spg', label: 'Steals',   short: 'STL', avgField: 'spg',  totalField: 'steals'   },
  { key: 'bpg', label: 'Blocks',   short: 'BLK', avgField: 'bpg',  totalField: 'blocks'   },
  { key: 'fgPct', label: 'FG%',    short: 'FG%', avgField: 'fgPercentage', totalField: 'fgPercentage', pct: true },
];

const fmtStat = (v: number, pct = false): string =>
  pct ? `${(v * 100).toFixed(1)}%` : v.toFixed(1);

// ── Component ─────────────────────────────────────────────────
export default function StatsHubScreen() {
  const router     = useRouter();
  const navigation = useNavigation();
  const { user }   = useAuth();

  const [segment,           setSegment]           = useState<Segment>('mystats');
  const [statsMode,         setStatsMode]         = useState<StatsMode>('avg');
  const [lbCategory,        setLbCategory]        = useState<StatCategory>('ppg');
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  const [refreshing,        setRefreshing]        = useState(false);

  // Reset to My Stats whenever the tab icon is pressed — covers both
  // switching back from another tab AND tapping the icon while already here.
  useEffect(() => {
    const unsub = navigation.addListener('tabPress' as any, () => {
      setSegment('mystats');
      setStatsMode('avg');
    });
    return unsub;
  }, [navigation]);

  // ── Data fetching ──────────────────────────────────────────
  const { data: myPlayers,      refetch: refetchMy }      = useQuery({ queryKey: ['myPlayers'],      queryFn: playersApi.getMyPlayers      });
  const { data: guardedPlayers, refetch: refetchGuarded } = useQuery({ queryKey: ['guardedPlayers'], queryFn: playersApi.getGuardedPlayers });

  // Deduplicate
  const allPlayers: Player[] = useMemo(() => {
    const raw  = [...(myPlayers ?? []), ...(guardedPlayers ?? [])];
    const seen = new Set<string>();
    return raw.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  }, [myPlayers, guardedPlayers]);

  const myPlayer = allPlayers[0] ?? null;

  const { data: playerFull, refetch: refetchFull } = useQuery({
    queryKey: ['playerFull', myPlayer?.slug],
    queryFn:  () => playersApi.getBySlug(myPlayer!.slug),
    enabled:  !!myPlayer?.slug,
  });

  // All leaderboards (6 parallel) — drives both "My Rankings" and "Leaderboards" view
  const { data: allLeaderboards, refetch: refetchLb } = useQuery({
    queryKey: ['allLeaderboards'],
    queryFn: async () => {
      const keys: StatCategory[] = ['ppg', 'rpg', 'apg', 'spg', 'bpg', 'fgPct'];
      const results = await Promise.all(keys.map(stat => leaderboardsApi.get({ stat })));
      return Object.fromEntries(keys.map((k, i) => [k, results[i]])) as Record<StatCategory, LeaderboardEntry[]>;
    },
  });

  // Standings
  const { data: standingsRaw, refetch: refetchStandings } = useQuery({
    queryKey: ['standings'],
    queryFn: async () => {
      try { return await api.get<any>('/api/standings'); }
      catch { return null; }
    },
    enabled: segment === 'standings',
  });

  // Parse standings into { division, entries[] }[]
  const divisions = useMemo<{ division: string; entries: EventStandingEntry[] }[]>(() => {
    if (!standingsRaw) return [];
    const data = standingsRaw.standings ?? standingsRaw;
    if (Array.isArray(data)) {
      // If flat array, group by .division field
      if (data.length > 0 && 'teamId' in data[0]) {
        const map = new Map<string, EventStandingEntry[]>();
        data.forEach((e: any) => {
          const div = e.division ?? 'Open';
          if (!map.has(div)) map.set(div, []);
          map.get(div)!.push(e);
        });
        return Array.from(map.entries()).map(([division, entries]) => ({ division, entries }));
      }
      // Already grouped
      return data.map((d: any) => ({
        division: d.division ?? d.name ?? 'Division',
        entries:  d.entries ?? d.teams ?? [],
      }));
    }
    return [];
  }, [standingsRaw]);

  // Current leaderboard for selected category
  const currentLb      = (allLeaderboards?.[lbCategory] ?? []) as LeaderboardEntry[];
  const currentLbLabel = STAT_CATS.find(c => c.key === lbCategory)!.label;
  const currentLbPct   = STAT_CATS.find(c => c.key === lbCategory)!.pct ?? false;

  // ── Helpers ────────────────────────────────────────────────
  const getPlayerRank = (statKey: StatCategory): { rank: number; value: number } | null => {
    if (!myPlayer || !allLeaderboards) return null;
    const lb  = allLeaderboards[statKey] as LeaderboardEntry[];
    const idx = lb?.findIndex(e => e.player.id === myPlayer.id) ?? -1;
    if (idx === -1) return null;
    return { rank: idx + 1, value: lb[idx].value };
  };

  const toggleDivision = (div: string) =>
    setExpandedDivisions(prev => {
      const next = new Set(prev);
      next.has(div) ? next.delete(div) : next.add(div);
      return next;
    });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMy(), refetchGuarded(), refetchFull(), refetchLb(), refetchStandings()]);
    setRefreshing(false);
  };

  // ── My Stats view ──────────────────────────────────────────
  const renderMyStats = () => {
    if (!myPlayer) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Player Linked</Text>
          <Text style={styles.emptyDesc}>Link a player to your account to view your stats and rankings.</Text>
        </View>
      );
    }

    const cs       = playerFull?.careerStats;
    const photoUri = myPlayer.profilePhoto ?? myPlayer.profileImageUrl;
    const pos      = myPlayer.primaryPosition ?? myPlayer.position;

    return (
      <>
        {/* ── Compact identity row ──────────────────────── */}
        <TouchableOpacity
          style={styles.identityRow}
          onPress={() => router.push(`/players/${myPlayer.slug}`)}
          activeOpacity={0.7}
        >
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.identityAvatar}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.identityAvatar, styles.identityAvatarFallback]}>
              <Text style={styles.identityInitials}>
                {(myPlayer.firstName?.[0] ?? '').toUpperCase()}
                {(myPlayer.lastName?.[0]  ?? '').toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.identityInfo}>
            <Text style={styles.identityName}>
              {myPlayer.firstName} {myPlayer.lastName}
            </Text>
            <View style={styles.identityMeta}>
              {pos && <Text style={styles.identityMetaText}>{pos}</Text>}
              {pos && myPlayer.graduationYear && <View style={styles.metaDot} />}
              {myPlayer.graduationYear && (
                <Text style={styles.identityMetaText}>Class of {myPlayer.graduationYear}</Text>
              )}
            </View>
          </View>

          <View style={styles.identityRight}>
            {cs && (
              <View style={styles.gpBadge}>
                <Text style={styles.gpBadgeText}>{cs.gamesPlayed} GP</Text>
              </View>
            )}
            <Text style={styles.identityChevron}>›</Text>
          </View>
        </TouchableOpacity>

        {/* ── Mode Toggle ──────────────────────────────── */}
        <View style={styles.modeToggle}>
          {([['avg', 'Per Game'], ['total', 'Season Totals']] as [StatsMode, string][]).map(([mode, label]) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeBtn, statsMode === mode && styles.modeBtnActive]}
              onPress={() => setStatsMode(mode)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, statsMode === mode && styles.modeBtnTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Stats Card ───────────────────────────────── */}
        {cs ? (
          <View style={styles.statsCard}>
            <View style={styles.statsCardTop}>
              <Text style={styles.statsCardTitle}>
                {statsMode === 'avg' ? 'SEASON AVERAGES' : 'SEASON TOTALS'}
              </Text>
              <TouchableOpacity
                onPress={() => router.push({
                  pathname: '/players/game-log',
                  params: { slug: myPlayer.slug, playerName: `${myPlayer.firstName} ${myPlayer.lastName}` },
                })}
                activeOpacity={0.7}
              >
                <Text style={styles.statsCardLink}>Game Log ›</Text>
              </TouchableOpacity>
            </View>

            {/* Main stats: PTS · REB · AST */}
            <View style={styles.mainStatsRow}>
              {[
                { label: 'PTS', val: statsMode === 'avg' ? cs.averages.ppg.toFixed(1) : String(cs.totals.points) },
                { label: 'REB', val: statsMode === 'avg' ? cs.averages.rpg.toFixed(1) : String(cs.totals.rebounds) },
                { label: 'AST', val: statsMode === 'avg' ? cs.averages.apg.toFixed(1) : String(cs.totals.assists) },
              ].map((s, i, arr) => (
                <React.Fragment key={s.label}>
                  <View style={styles.mainStatItem}>
                    <Text style={styles.mainStatValue}>{s.val}</Text>
                    <Text style={styles.mainStatLabel}>{s.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.statDivider} />}
                </React.Fragment>
              ))}
            </View>

            <View style={styles.cardDividerLine} />

            {/* Secondary stats: STL · BLK · TO */}
            <View style={styles.secondaryStatsRow}>
              {[
                { label: 'STL', val: statsMode === 'avg' ? cs.averages.spg.toFixed(1) : String(cs.totals.steals) },
                { label: 'BLK', val: statsMode === 'avg' ? cs.averages.bpg.toFixed(1) : String(cs.totals.blocks) },
                { label: 'TO',  val: statsMode === 'avg' ? cs.averages.topg.toFixed(1) : String(cs.totals.turnovers) },
              ].map((s, i, arr) => (
                <React.Fragment key={s.label}>
                  <View style={styles.secondaryStatItem}>
                    <Text style={styles.secondaryStatValue}>{s.val}</Text>
                    <Text style={styles.secondaryStatLabel}>{s.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.statDivider} />}
                </React.Fragment>
              ))}
            </View>

            <View style={styles.cardDividerLine} />

            {/* Shooting: FG% · 3P% · FT% */}
            <View style={styles.shootingRow}>
              {[
                { label: 'FG%', val: `${(cs.shooting.fgPct  * 100).toFixed(1)}%` },
                { label: '3P%', val: `${(cs.shooting.fg3Pct * 100).toFixed(1)}%` },
                { label: 'FT%', val: `${(cs.shooting.ftPct  * 100).toFixed(1)}%` },
              ].map((s, i, arr) => (
                <React.Fragment key={s.label}>
                  <View style={styles.shootingItem}>
                    <Text style={styles.shootingValue}>{s.val}</Text>
                    <Text style={styles.shootingLabel}>{s.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.statDivider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>SEASON STATS</Text>
            <Text style={styles.statsEmptyText}>
              No stats recorded yet. Stats will appear once games are logged.
            </Text>
          </View>
        )}

        {/* ── My Rankings ──────────────────────────────── */}
        <View style={styles.rankingsSection}>
          <Text style={styles.rankingsSectionTitle}>MY RANKINGS</Text>
          <Text style={styles.rankingsSectionSub}>Your position in the EHA leaderboards</Text>

          <View style={styles.rankingsCard}>
            {STAT_CATS.map((cat, idx) => {
              const rd     = getPlayerRank(cat.key);
              const isLast = idx === STAT_CATS.length - 1;
              const isTop3 = rd && rd.rank <= 3;

              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.rankingRow,
                    !isLast && styles.rankingRowBorder,
                    isTop3   && styles.rankingRowTop,
                  ]}
                  onPress={() => { setSegment('leaderboards'); setLbCategory(cat.key); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rankingLabel}>{cat.label}</Text>

                  <View style={styles.rankingRight}>
                    {rd ? (
                      <>
                        <Text style={[styles.rankingVal, isTop3 && { color: Colors.gold }]}>
                          {fmtStat(rd.value, cat.pct)}
                        </Text>
                        <View style={[
                          styles.rankBadge,
                          isTop3 ? { backgroundColor: RANK_COLORS[rd.rank - 1] } : styles.rankBadgeDefault,
                        ]}>
                          <Text style={[styles.rankBadgeText, isTop3 && { color: '#0F172A' }]}>
                            #{rd.rank}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.rankingNone}>Not ranked</Text>
                    )}
                    <Text style={styles.rankChevron}>›</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </>
    );
  };

  // ── Leaderboards view ──────────────────────────────────────
  const renderLeaderboards = () => (
    <>
      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillBar}
        style={styles.pillScroll}
      >
        {STAT_CATS.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.pill, lbCategory === cat.key && styles.pillActive]}
            onPress={() => setLbCategory(cat.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, lbCategory === cat.key && styles.pillTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Leader rows */}
      {currentLb.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyDesc}>No leaderboard data available.</Text>
        </View>
      ) : (
        <View style={styles.leaderList}>
          {currentLb.map((item: LeaderboardEntry, index: number) => {
            const rank   = index + 1;
            const isTop3 = rank <= 3;
            const isMe   = !!myPlayer && item.player.id === myPlayer.id;

            return (
              <TouchableOpacity
                key={`${item.player.id}-${item.statKey}-${index}`}
                style={[
                  styles.leaderRow,
                  index % 2 === 1 && styles.leaderRowAlt,
                  isMe            && styles.leaderRowMe,
                ]}
                onPress={() => router.push(`/players/${item.player.slug}`)}
                activeOpacity={0.7}
              >
                {/* Rank badge */}
                <View style={[
                  styles.rankBadge,
                  isTop3 ? { backgroundColor: RANK_COLORS[rank - 1] } : styles.rankBadgeDefault,
                ]}>
                  <Text style={[styles.rankBadgeText, isTop3 && { color: '#0F172A' }]}>
                    {rank}
                  </Text>
                </View>

                {/* Avatar */}
                <Image
                  source={{ uri: item.player.profileImageUrl ?? undefined }}
                  style={styles.leaderAvatar}
                  contentFit="cover"
                  transition={200}
                />

                {/* Info */}
                <View style={styles.leaderInfo}>
                  <Text style={[styles.leaderName, isMe && { color: Colors.gold }]} numberOfLines={1}>
                    {item.player.firstName} {item.player.lastName}
                    {isMe ? '  (You)' : ''}
                  </Text>
                  <Text style={styles.leaderMeta}>
                    {[
                      item.player.position,
                      item.player.graduationYear ? `'${String(item.player.graduationYear).slice(2)}` : null,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                </View>

                {/* Stat value */}
                <View style={styles.leaderStat}>
                  <Text style={[
                    styles.leaderStatNum,
                    isTop3 && { color: Colors.textPrimary },
                    isMe   && { color: Colors.gold },
                  ]}>
                    {fmtStat(item.value, currentLbPct)}
                  </Text>
                  <Text style={styles.leaderStatLabel}>{currentLbLabel.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );

  // ── Standings view ─────────────────────────────────────────
  const renderStandings = () => {
    if (divisions.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Standings Yet</Text>
          <Text style={styles.emptyDesc}>
            Standings will appear once division games have been played.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.standingsContainer}>
        {divisions.map(({ division, entries }) => {
          const expanded = expandedDivisions.has(division);
          const sorted   = [...entries].sort(
            (a, b) => b.wins - a.wins || (b.pointDiff ?? 0) - (a.pointDiff ?? 0)
          );

          return (
            <View key={division} style={styles.divisionCard}>
              {/* Accordion header */}
              <TouchableOpacity
                style={styles.divisionHeader}
                onPress={() => toggleDivision(division)}
                activeOpacity={0.7}
              >
                <View style={styles.divisionLeft}>
                  <View style={styles.divisionDot} />
                  <Text style={styles.divisionName}>{division}</Text>
                </View>
                <View style={styles.divisionRight}>
                  <Text style={styles.divisionCount}>{entries.length} teams</Text>
                  <Text style={[styles.divisionChevron, expanded && styles.divisionChevronOpen]}>›</Text>
                </View>
              </TouchableOpacity>

              {/* Team table */}
              {expanded && (
                <View style={styles.teamTable}>
                  {/* Column headers */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.teamCol]}>TEAM</Text>
                    <Text style={[styles.tableHeaderText, styles.numCol]}>GP</Text>
                    <Text style={[styles.tableHeaderText, styles.numCol]}>W</Text>
                    <Text style={[styles.tableHeaderText, styles.numCol]}>L</Text>
                    <Text style={[styles.tableHeaderText, styles.numCol]}>DIFF</Text>
                  </View>

                  {/* Rows */}
                  {sorted.map((entry, idx) => {
                    const gp   = entry.wins + entry.losses;
                    const diff = entry.pointDiff ?? 0;
                    return (
                      <View
                        key={entry.teamId}
                        style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                      >
                        <View style={[styles.tableTeamCell, styles.teamCol]}>
                          {entry.teamLogo ? (
                            <Image
                              source={{ uri: entry.teamLogo }}
                              style={styles.teamLogo}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.teamLogoFallback}>
                              <Text style={styles.teamLogoInitial}>
                                {(entry.teamName[0] ?? '').toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.tableTeamName} numberOfLines={1}>
                            {entry.teamName}
                          </Text>
                        </View>
                        <Text style={[styles.tableNum, styles.numCol]}>{gp}</Text>
                        <Text style={[styles.tableNum, styles.numCol, { color: Colors.success }]}>
                          {entry.wins}
                        </Text>
                        <Text style={[styles.tableNum, styles.numCol, { color: Colors.red }]}>
                          {entry.losses}
                        </Text>
                        <Text style={[
                          styles.tableNum,
                          styles.numCol,
                          diff > 0 ? styles.diffPos : diff < 0 ? styles.diffNeg : {},
                        ]}>
                          {diff > 0 ? `+${diff}` : String(diff)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // ── Main render ────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── FROSTED GLASS HEADER ─────────────────────────── */}
      <View style={[styles.stickyHeader, { height: HEADER_HEIGHT }]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={[styles.headerInner, { paddingTop: Platform.OS === 'ios' ? 50 : 30 }]}>

            {/* Title row */}
            <View style={styles.headerTitleRow}>
              <Image
                source={require('../../assets/eha-connect-logo.png')}
                style={styles.headerLogo}
                contentFit="contain"
              />
              <Text style={styles.headerName}>Stats</Text>
            </View>

            {/* Segmented control */}
            <View style={styles.segmentedControl}>
              {([
                ['mystats',      'My Stats'    ],
                ['leaderboards', 'Leaderboards'],
                ['standings',    'Standings'   ],
              ] as [Segment, string][]).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.segBtn, segment === key && styles.segBtnActive]}
                  onPress={() => setSegment(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segBtnText, segment === key && styles.segBtnTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </BlurView>
      </View>

      {/* ── SCROLLABLE CONTENT ───────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: HEADER_HEIGHT + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />
        }
      >
        {segment === 'mystats'      && renderMyStats()      }
        {segment === 'leaderboards' && renderLeaderboards() }
        {segment === 'standings'    && renderStandings()    }

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──────────────────────────────────────────────────
  stickyHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
  },
  headerInner: {
    flex: 1,
    flexDirection: 'column',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    gap: Spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerLogo: {
    width: 40,
    height: 40,
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
  // ── Segmented control ────────────────────────────────────────
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.md,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  segBtnActive: {
    backgroundColor: Colors.red,
  },
  segBtnText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
  },
  segBtnTextActive: {
    color: Colors.textPrimary,
  },

  // ── ScrollView ───────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },

  // ── Compact identity row ─────────────────────────────────────
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  identityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceLight,
  },
  identityAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInitials: {
    fontSize: FontSize.md,
    fontFamily: Fonts.headingBlack,
    color: Colors.textSecondary,
  },
  identityInfo: {
    flex: 1,
  },
  identityName: {
    fontSize: FontSize.md,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  identityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  identityMetaText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.surfaceLight,
  },
  identityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  identityChevron: {
    fontSize: FontSize.xl,
    color: Colors.textMuted,
    fontWeight: '300',
  },
  gpBadge: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gpBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },

  // ── Mode toggle ──────────────────────────────────────────────
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
    marginBottom: Spacing.lg,
    gap: 2,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: Colors.navyLight,
  },
  modeBtnText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
  },
  modeBtnTextActive: {
    color: Colors.textPrimary,
  },

  // ── Stats card ───────────────────────────────────────────────
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xxl,
  },
  statsCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statsCardTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingBlack,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  statsCardLink: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
  },
  mainStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  mainStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: 30,
    fontFamily: Fonts.headingBlack,
    color: Colors.textPrimary,
  },
  mainStatLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
    marginTop: 4,
    letterSpacing: 1,
  },
  cardDividerLine: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  secondaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  secondaryStatValue: {
    fontSize: FontSize.xl,
    fontFamily: Fonts.headingBlack,
    color: Colors.textSecondary,
  },
  secondaryStatLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
    marginTop: 3,
    letterSpacing: 1,
  },
  shootingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  shootingItem: {
    flex: 1,
    alignItems: 'center',
  },
  shootingValue: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.headingBlack,
    color: Colors.textSecondary,
  },
  shootingLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
    marginTop: 3,
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  statsEmptyText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 20,
  },

  // ── Rankings section ─────────────────────────────────────────
  rankingsSection: {
    marginBottom: Spacing.xxl,
  },
  rankingsSectionTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.headingBlack,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  rankingsSectionSub: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  rankingsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rankingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rankingRowTop: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  rankingLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
    flex: 1,
  },
  rankingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rankingVal: {
    fontSize: FontSize.md,
    fontFamily: Fonts.headingBlack,
    color: Colors.textSecondary,
    minWidth: 44,
    textAlign: 'right',
  },
  rankingNone: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  rankBadge: {
    minWidth: 34,
    height: 22,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  rankBadgeDefault: {
    backgroundColor: Colors.surfaceLight,
  },
  rankBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.headingBlack,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  rankChevron: {
    fontSize: FontSize.xl,
    color: Colors.textMuted,
    fontWeight: '300',
    marginLeft: 2,
  },

  // ── Leaderboard: pills ───────────────────────────────────────
  pillScroll: {
    marginHorizontal: -Spacing.xl,
    marginBottom: Spacing.md,
  },
  pillBar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.red,
    borderColor: Colors.red,
  },
  pillText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.textPrimary,
  },

  // ── Leaderboard: list ────────────────────────────────────────
  leaderList: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
  },
  leaderRowAlt: {
    backgroundColor: '#182234',
  },
  leaderRowMe: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.gold,
  },
  leaderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceLight,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  leaderMeta: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  leaderStat: {
    alignItems: 'flex-end',
  },
  leaderStatNum: {
    fontSize: FontSize.xl,
    fontFamily: Fonts.headingBlack,
    color: Colors.textSecondary,
  },
  leaderStatLabel: {
    fontSize: 9,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 1,
  },

  // ── Standings ────────────────────────────────────────────────
  standingsContainer: {
    gap: Spacing.md,
  },
  divisionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  divisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  divisionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  divisionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.red,
  },
  divisionName: {
    fontSize: FontSize.md,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  divisionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  divisionCount: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  divisionChevron: {
    fontSize: FontSize.xl,
    color: Colors.textMuted,
    fontWeight: '300',
  },
  divisionChevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  teamTable: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.navySurface,
  },
  tableHeaderText: {
    fontSize: 9,
    fontFamily: Fonts.headingBlack,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  tableRowAlt: {
    backgroundColor: '#182234',
  },
  tableTeamCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  teamCol: {
    flex: 1,
  },
  numCol: {
    width: 40,
    textAlign: 'center',
  },
  teamLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
  },
  teamLogoFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoInitial: {
    fontSize: 10,
    fontFamily: Fonts.headingBlack,
    color: Colors.textSecondary,
  },
  tableTeamName: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
    flex: 1,
  },
  tableNum: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  diffPos: { color: Colors.success },
  diffNeg: { color: Colors.red },

  // ── Empty states ─────────────────────────────────────────────
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
