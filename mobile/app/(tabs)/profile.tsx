import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Linking,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { format } from 'date-fns';
import { Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { playersApi } from '@/api/players';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 80;
const HERO_HEIGHT = Math.round(SCREEN_WIDTH * 0.9);
const PHOTO_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.lg * 2 - Spacing.sm) / 2;
const ACHIEVEMENT_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.lg * 2 - Spacing.sm * 2) / 3;
const FILM_EMBED_GAP = Spacing.sm;
const FILM_EMBED_WIDTH = SCREEN_WIDTH - 80;
const FILM_EMBED_HEIGHT = Math.round(FILM_EMBED_WIDTH * (9 / 16));

// ── Helpers ───────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getHudlEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('hudl.com')) return null;
    if (u.pathname.includes('/video/')) {
      return `https://www.hudl.com/embed${u.pathname}`;
    }
    return null;
  } catch {
    return null;
  }
}

interface FilmItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string | null;
  type: 'youtube' | 'hudl' | 'other';
}

// ── Main Screen ───────────────────────────────────────────────

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useColors();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [videoModal, setVideoModal] = useState<{ title: string; ytId?: string; embedUrl?: string; videoUrl?: string } | null>(null);
  const [photoModal, setPhotoModal] = useState<{ photos: any[]; idx: number } | null>(null);
  const [photoViewIdx, setPhotoViewIdx] = useState(0);

  // Reset to first player on tab re-tap
  useEffect(() => {
    const unsub = navigation.addListener('tabPress' as any, () => {
      setSelectedIdx(0);
    });
    return unsub;
  }, [navigation]);

  // ── Sub-components (inside to access colors) ─────────────────

  function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }, highlight && { color: colors.gold }]}>{value}</Text>
      </View>
    );
  }

  function BigStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
      <View style={styles.bigStat}>
        <Text style={[styles.bigStatValue, { color: colors.textPrimary }, highlight && { color: colors.red }]}>{value}</Text>
        <Text style={[styles.bigStatLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
    );
  }

  function SmallStat({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.smallStat}>
        <Text style={[styles.smallStatValue, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.smallStatLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
    );
  }

  function ShootingStat({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.shootingStatItem}>
        <Text style={[styles.shootingStatValue, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.shootingStatLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
    );
  }

  // ── Fetch player list ──────────────────────────────────────
  const { data: myPlayers, refetch: refetchMine } = useQuery({
    queryKey: ['myPlayers'],
    queryFn: playersApi.getMyPlayers,
  });

  const { data: guardedPlayers, refetch: refetchGuarded } = useQuery({
    queryKey: ['guardedPlayers'],
    queryFn: playersApi.getGuardedPlayers,
  });

  // Deduplicate by player ID — same player can appear in both lists
  const seen = new Set<string>();
  const allPlayers = [...(myPlayers ?? []), ...(guardedPlayers ?? [])].filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  const selectedBase = allPlayers[selectedIdx];

  // Only parents with multiple distinct players get the switcher
  const showSwitcher = user?.role === 'PARENT' && allPlayers.length > 1;

  // ── Fetch full detail ──────────────────────────────────────
  const { data: player, isLoading, refetch: refetchDetail } = useQuery({
    queryKey: ['playerDetail', selectedBase?.slug],
    queryFn: () => playersApi.getBySlug(selectedBase!.slug),
    enabled: !!selectedBase?.slug,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMine(), refetchGuarded(), refetchDetail()]);
    setRefreshing(false);
  };

  if (!selectedBase && !isLoading) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Player Profile</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
          You don't have a player profile linked to your account yet.
        </Text>
      </View>
    );
  }

  if (isLoading || !player) {
    return <Loading message="Loading profile..." />;
  }

  // Full API response has extra fields not in the TS type
  const p = player as any;

  const heightDisplay = p.heightFeet != null && p.heightInches != null
    ? `${p.heightFeet}'${p.heightInches}"`
    : p.heightInches != null
      ? `${Math.floor(p.heightInches / 12)}'${p.heightInches % 12}"`
      : null;

  const positionDisplay: string | null = p.primaryPosition ?? p.position ?? null;
  const currentTeam = p.teamRosters?.find((r: any) => !r.leftAt) ?? null;
  const photos: any[] = p.media?.filter((m: any) => m.type === 'PHOTO') ?? [];
  const isVerified: boolean = (p.guardians?.length > 0) || !!p.userId;

  const twitterUrl = p.twitterHandle
    ? `https://twitter.com/${p.twitterHandle.replace('@', '')}`
    : null;
  const instagramUrl = p.instagramHandle
    ? `https://instagram.com/${p.instagramHandle.replace('@', '')}`
    : null;

  // ── Build film items — only individual videos, NOT profile links ──
  const filmItemsMap = new Map<string, FilmItem>();

  // highlightUrl is an individual video link (not a profile), so include it
  if (p.highlightUrl) {
    const ytId = extractYouTubeId(p.highlightUrl);
    filmItemsMap.set(p.highlightUrl, {
      id: 'highlight-direct',
      url: p.highlightUrl,
      title: 'Highlight Reel',
      thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null,
      type: ytId ? 'youtube' : p.highlightUrl.includes('hudl.com') ? 'hudl' : 'other',
    });
  }
  // Media items (uploaded videos + highlights from DB)
  if (p.media) {
    (p.media as any[])
      .filter((m: any) => m.type === 'VIDEO' || m.type === 'HIGHLIGHT')
      .forEach((m: any) => {
        if (!filmItemsMap.has(m.url)) {
          const ytId = extractYouTubeId(m.url);
          filmItemsMap.set(m.url, {
            id: m.id,
            url: m.url,
            title: m.title || 'Highlight Video',
            thumbnail: m.thumbnail || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null),
            type: ytId ? 'youtube' : m.url.includes('hudl.com') ? 'hudl' : 'other',
          });
        }
      });
  }
  const filmItems = Array.from(filmItemsMap.values());
  // Profile links for direct-link buttons (Hudl profile, YouTube channel)
  const hudlProfileUrl: string | null = p.hudlUrl || null;
  const youtubeChannelUrl: string | null = p.youtubeUrl || null;

  const handleFilmPress = (item: FilmItem) => {
    if (item.type === 'youtube') {
      const ytId = extractYouTubeId(item.url);
      if (ytId) {
        setVideoModal({ title: item.title, ytId });
        return;
      }
    }
    if (item.type === 'hudl') {
      const embedUrl = getHudlEmbedUrl(item.url);
      if (embedUrl) {
        setVideoModal({ title: item.title, embedUrl });
        return;
      }
    }
    // All other videos (uploaded from camera roll, blob URLs, etc.) play in-app via WebView
    setVideoModal({ title: item.title, videoUrl: item.url });
  };

  const openPhoto = (idx: number) => {
    setPhotoViewIdx(idx);
    setPhotoModal({ photos: photos.slice(0, 6), idx });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── FROSTED GLASS HEADER ──────────────────────────── */}
      <View style={[styles.stickyHeader, { height: HEADER_HEIGHT }]}>
        <BlurView intensity={80} tint={colors.glassTint} style={StyleSheet.absoluteFill}>
          <View style={[styles.headerInner, { paddingTop: Platform.OS === 'ios' ? 50 : 30, backgroundColor: colors.headerOverlay }]}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/eha-connect-logo.png')}
                style={styles.headerLogo}
                contentFit="contain"
              />
              <Text style={[styles.headerName, { color: colors.textPrimary }]}>My Profile</Text>
            </View>
            {selectedBase && (
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => router.push({ pathname: '/players/edit', params: { id: selectedBase.id, slug: selectedBase.slug } })}
                activeOpacity={0.7}
              >
                <Text style={[styles.editBtnText, { color: colors.textPrimary }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
        <View style={[styles.headerBorder, { backgroundColor: colors.headerBorder }]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.red} />
        }
      >
        {/* ── Player switcher (parents with multiple players only) */}
        {showSwitcher && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.switcherBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
            contentContainerStyle={styles.switcherContent}
          >
            {allPlayers.map((pl, idx) => (
              <TouchableOpacity
                key={pl.id}
                style={[
                  styles.switcherChip,
                  { borderColor: colors.border },
                  idx === selectedIdx && { borderColor: colors.red, backgroundColor: colors.redTint },
                ]}
                onPress={() => setSelectedIdx(idx)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: (pl as any).profilePhoto ?? pl.profileImageUrl ?? undefined }}
                  style={[styles.switcherAvatar, { backgroundColor: colors.surfaceLight }]}
                  contentFit="cover"
                />
                <Text style={[
                  styles.switcherName,
                  { color: colors.textSecondary },
                  idx === selectedIdx && { color: colors.red, fontFamily: Fonts.bodySemiBold },
                ]}>
                  {pl.firstName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Hero Photo ────────────────────────────────────── */}
        {/* KEY EXCEPTION: Hero section keeps hardcoded dark styling for text readability on images */}
        <View style={[styles.hero, { height: HERO_HEIGHT, backgroundColor: colors.surfaceLight }]}>
          <Image
            source={{ uri: p.profilePhoto ?? p.profileImageUrl ?? undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={['transparent', 'rgba(15,23,42,0.65)', colors.background]}
            locations={[0.35, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>&#10003;  VERIFIED ATHLETE</Text>
            </View>
          )}
          <View style={styles.heroInfo}>
            <View style={styles.heroBadges}>
              {positionDisplay && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{positionDisplay}</Text>
                </View>
              )}
              {p.graduationYear && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Class of {p.graduationYear}</Text>
                </View>
              )}
              {p.jerseyNumber && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>#{p.jerseyNumber}</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroName}>{p.firstName} {p.lastName}</Text>
            {p.school && <Text style={styles.heroSchool}>{p.school}</Text>}
            {currentTeam && <Text style={styles.heroTeam}>{currentTeam.team.name}</Text>}
            {p.city && p.state && (
              <Text style={styles.heroLocation}>{p.city}, {p.state}</Text>
            )}
          </View>
        </View>

        {/* ── Athlete Info ──────────────────────────────────── */}
        <Card style={styles.card}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>ATHLETE INFO</Text>
          <View style={styles.infoGrid}>
            {heightDisplay && <InfoRow label="Height" value={heightDisplay} />}
            {p.weight && <InfoRow label="Weight" value={`${p.weight} lbs`} />}
            {positionDisplay && <InfoRow label="Position" value={positionDisplay} />}
            {p.graduationYear && <InfoRow label="Class" value={`${p.graduationYear}`} />}
            {p.gpa != null && <InfoRow label="GPA" value={Number(p.gpa).toFixed(2)} highlight />}
            {currentTeam && <InfoRow label="Club Team" value={currentTeam.team.name} />}
            {p.jerseyNumber && <InfoRow label="Jersey #" value={`#${p.jerseyNumber}`} />}
            {p.gradeLevel && <InfoRow label="Grade" value={`${p.gradeLevel}th`} />}
            {p.maxPrepsUrl && (
              <TouchableOpacity
                style={[styles.infoRowLink, { borderBottomColor: colors.border }]}
                onPress={() => Linking.openURL(p.maxPrepsUrl)}
                activeOpacity={0.7}
              >
                <View style={styles.infoLinkLeft}>
                  <View style={[styles.brandDot, { backgroundColor: '#005CA9' }]} />
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>MaxPreps</Text>
                </View>
                <Text style={[styles.infoLinkArrow, { color: colors.textMuted }]}>View Profile  ↗</Text>
              </TouchableOpacity>
            )}
          </View>
          {p.transcriptUrl && (
            <TouchableOpacity
              style={[styles.transcriptBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => Linking.openURL(p.transcriptUrl)}
              activeOpacity={0.7}
            >
              <Text style={[styles.transcriptBtnText, { color: colors.textSecondary }]}>Download Transcript (PDF)</Text>
            </TouchableOpacity>
          )}
          {(twitterUrl || instagramUrl) && (
            <View style={styles.socialRow}>
              {twitterUrl && (
                <TouchableOpacity
                  style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => Linking.openURL(twitterUrl!)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.socialLogoX, { color: colors.textPrimary }]}>&#120143;</Text>
                  <Text style={[styles.socialBtnText, { color: colors.textSecondary }]}>Twitter / X</Text>
                </TouchableOpacity>
              )}
              {instagramUrl && (
                <TouchableOpacity
                  style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => Linking.openURL(instagramUrl!)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={require('../../assets/logos/instagram.png')}
                    style={styles.socialLogoImg}
                    contentFit="contain"
                    tintColor="#FFFFFF"
                  />
                  <Text style={[styles.socialBtnText, { color: colors.textSecondary }]}>Instagram</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card>

        {/* ── Season Stats ──────────────────────────────────── */}
        <Card style={styles.card}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>SEASON AVERAGES</Text>
          {player.careerStats && player.careerStats.gamesPlayed > 0 ? (
            <>
              <View style={styles.mainStatsRow}>
                <BigStat label="PTS" value={player.careerStats.averages.ppg.toFixed(1)} highlight />
                <BigStat label="REB" value={player.careerStats.averages.rpg.toFixed(1)} />
                <BigStat label="AST" value={player.careerStats.averages.apg.toFixed(1)} />
              </View>
              <View style={styles.secondaryStatsRow}>
                <SmallStat label="STL" value={player.careerStats.averages.spg.toFixed(1)} />
                <SmallStat label="BLK" value={player.careerStats.averages.bpg.toFixed(1)} />
                <SmallStat label="TOV" value={player.careerStats.averages.topg.toFixed(1)} />
              </View>
              <View style={[styles.shootingRow, { backgroundColor: colors.background }]}>
                <ShootingStat label="FG%" value={`${player.careerStats.shooting.fgPct.toFixed(1)}%`} />
                <View style={[styles.shootingDivider, { backgroundColor: colors.border }]} />
                <ShootingStat label="3PT%" value={`${player.careerStats.shooting.fg3Pct.toFixed(1)}%`} />
                <View style={[styles.shootingDivider, { backgroundColor: colors.border }]} />
                <ShootingStat label="FT%" value={`${player.careerStats.shooting.ftPct.toFixed(1)}%`} />
              </View>
              <Text style={[styles.gamesPlayedText, { color: colors.textMuted }]}>{player.careerStats.gamesPlayed} games played</Text>
            </>
          ) : (
            <Text style={[styles.noData, { color: colors.textMuted }]}>No stats recorded yet</Text>
          )}
        </Card>

        {/* ── Bio ───────────────────────────────────────────── */}
        {p.bio ? (
          <Card style={styles.card}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>ABOUT</Text>
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>{p.bio}</Text>
          </Card>
        ) : null}

        {/* ── Recent Game Log ───────────────────────────────── */}
        {p.gameStats && p.gameStats.length > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>RECENT GAMES</Text>
            {(p.gameStats as any[]).slice(0, 5).map((stat: any) => {
              const dateStr = stat.game?.scheduledAt
                ? format(new Date(stat.game.scheduledAt), 'MMM d')
                : '—';
              const eventName = stat.game?.event?.name ?? null;
              return (
                <View key={stat.id} style={[styles.gameRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.gameRowLeft}>
                    <Text style={[styles.gameDate, { color: colors.textMuted }]}>{dateStr}{eventName ? `  ·  ${eventName}` : ''}</Text>
                    <View style={styles.gameTeams}>
                      <Text style={[styles.gameTeamName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {stat.game?.homeTeam?.name ?? '—'} vs {stat.game?.awayTeam?.name ?? '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.gameRowStats}>
                    <View style={styles.gameStatCol}>
                      <Text style={[styles.gameStatVal, { color: colors.textPrimary }]}>{stat.points}</Text>
                      <Text style={[styles.gameStatLabel, { color: colors.textMuted }]}>PTS</Text>
                    </View>
                    <View style={styles.gameStatCol}>
                      <Text style={[styles.gameStatVal, { color: colors.textPrimary }]}>{stat.rebounds}</Text>
                      <Text style={[styles.gameStatLabel, { color: colors.textMuted }]}>REB</Text>
                    </View>
                    <View style={styles.gameStatCol}>
                      <Text style={[styles.gameStatVal, { color: colors.textPrimary }]}>{stat.assists}</Text>
                      <Text style={[styles.gameStatLabel, { color: colors.textMuted }]}>AST</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            {(p.gameStats as any[]).length > 5 && (
              <TouchableOpacity
                style={styles.viewMoreBtn}
                onPress={() => router.push({ pathname: '/players/game-log', params: { slug: p.slug } })}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewMoreText, { color: colors.red }]}>View Full Game Log →</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* ── Achievements ──────────────────────────────────── */}
        {p.achievements && (p.achievements as any[]).length > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>ACHIEVEMENTS</Text>
            <View style={styles.achievementsGrid}>
              {(p.achievements as any[]).slice(0, 6).map((a: any) => (
                <View key={a.id} style={[styles.achievementChip, { width: ACHIEVEMENT_SIZE, backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={styles.achievementIcon}>&#127942;</Text>
                  <Text style={[styles.achievementTitle, { color: colors.textPrimary }]} numberOfLines={2}>{a.title}</Text>
                  {a.eventName && (
                    <Text style={[styles.achievementEvent, { color: colors.textMuted }]} numberOfLines={1}>{a.eventName}</Text>
                  )}
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* ── Film Room ─────────────────────────────────────── */}
        {(filmItems.length > 0 || hudlProfileUrl || youtubeChannelUrl) && (
          <Card style={styles.card}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>FILM ROOM</Text>
            {/* Direct-link buttons for Hudl profile & YouTube channel */}
            {(hudlProfileUrl || youtubeChannelUrl) && (
              <View style={styles.filmSegmentRow}>
                {hudlProfileUrl && (
                  <TouchableOpacity
                    style={[
                      styles.filmSegmentBtn,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => setVideoModal({ title: 'Hudl', embedUrl: hudlProfileUrl })}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={require('../../assets/logos/hudl.png')}
                      style={styles.filmSegmentLogo}
                      contentFit="contain"
                    />
                  </TouchableOpacity>
                )}
                {youtubeChannelUrl && (
                  <TouchableOpacity
                    style={[
                      styles.filmSegmentBtn,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => setVideoModal({ title: 'YouTube', embedUrl: youtubeChannelUrl })}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={require('../../assets/logos/youtube.png')}
                      style={[styles.filmSegmentLogo, { tintColor: '#FFFFFF' }]}
                      contentFit="contain"
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {/* All videos in one carousel */}
            {filmItems.length > 0 && (
              <FlatList
                horizontal
                data={filmItems}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                snapToInterval={FILM_EMBED_WIDTH + FILM_EMBED_GAP}
                decelerationRate="fast"
                style={styles.filmList}
                contentContainerStyle={styles.filmListContent}
                scrollEnabled={filmItems.length > 1}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.filmVideoCard, { backgroundColor: colors.surfaceLight }]}
                    onPress={() => handleFilmPress(item)}
                    activeOpacity={0.85}
                  >
                    {item.thumbnail ? (
                      <Image
                        source={{ uri: item.thumbnail }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, styles.filmFallbackBg]}>
                        <View style={styles.filmPlayCircle}>
                          <View style={styles.filmPlayTriangle} />
                        </View>
                      </View>
                    )}
                    {/* Gradient overlay on film card — stays dark for text readability on images */}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.75)']}
                      style={StyleSheet.absoluteFill}
                    />
                    {/* Play button */}
                    {item.thumbnail && (
                      <View style={styles.filmPlayCircle}>
                        <View style={styles.filmPlayTriangle} />
                      </View>
                    )}
                    {/* Title — hardcoded white for readability on image overlay */}
                    <View style={styles.filmCardInfo}>
                      <Text style={styles.filmCardTitle} numberOfLines={1}>{item.title}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </Card>
        )}

        {/* ── Photos ────────────────────────────────────────── */}
        {photos.length > 0 && (
          <View style={styles.photosSection}>
            <Text style={[styles.photosSectionLabel, { color: colors.textSecondary }]}>PHOTOS</Text>
            <View style={styles.photosGrid}>
              {photos.slice(0, 6).map((photo: any, idx: number) => (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => openPhoto(idx)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={[styles.photoThumb, { width: PHOTO_SIZE, height: PHOTO_SIZE, backgroundColor: colors.surfaceLight }]}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Video Player Modal ────────────────────────────── */}
      {/* Video modal keeps hardcoded #000 background */}
      <Modal
        visible={!!videoModal}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setVideoModal(null)}
      >
        <View style={styles.videoModalContainer}>
          <View style={[styles.videoModalHeader, { paddingTop: Platform.OS === 'ios' ? 54 : 32 }]}>
            <Text style={styles.videoModalTitle} numberOfLines={1}>
              {videoModal?.title}
            </Text>
            <TouchableOpacity onPress={() => setVideoModal(null)} style={styles.videoModalClose}>
              <Text style={styles.videoModalCloseText}>&#10005;</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.videoPlayer}>
            {videoModal?.ytId ? (
              <WebView
                source={{
                  html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>*{margin:0;padding:0;background:#000}iframe{position:absolute;top:0;left:0;width:100%;height:100%}</style></head><body><iframe src="https://www.youtube.com/embed/${videoModal.ytId}?autoplay=1&playsinline=1&rel=0&origin=https://ehaconnect.com" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></body></html>`,
                  baseUrl: 'https://ehaconnect.com',
                }}
                style={{ flex: 1, backgroundColor: '#000' }}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={['*']}
              />
            ) : videoModal?.videoUrl ? (
              <WebView
                source={{ html: `
                  <html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;">
                    <video src="${videoModal.videoUrl}" controls autoplay playsinline style="width:100%;max-height:100vh;background:#000;" />
                  </body></html>
                ` }}
                style={{ flex: 1, backgroundColor: '#000' }}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
              />
            ) : videoModal?.embedUrl ? (
              <WebView
                source={{ uri: videoModal.embedUrl }}
                style={{ flex: 1, backgroundColor: '#000' }}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── Photo Lightbox Modal ──────────────────────────── */}
      {/* Photo lightbox keeps hardcoded dark background for full-screen photo viewing */}
      <Modal
        visible={!!photoModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPhotoModal(null)}
      >
        <View style={styles.photoModalContainer}>
          <TouchableOpacity
            style={[styles.photoModalClose, { top: Platform.OS === 'ios' ? 54 : 32 }]}
            onPress={() => setPhotoModal(null)}
          >
            <Text style={styles.photoModalCloseText}>&#10005;</Text>
          </TouchableOpacity>
          {photoModal && (
            <FlatList
              data={photoModal.photos}
              horizontal
              pagingEnabled
              initialScrollIndex={photoModal.idx}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setPhotoViewIdx(idx);
              }}
              renderItem={({ item }) => (
                <View style={styles.photoModalSlide}>
                  <Image
                    source={{ uri: item.url }}
                    style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.25 }}
                    contentFit="contain"
                  />
                </View>
              )}
            />
          )}
          {photoModal && photoModal.photos.length > 1 && (
            <View style={styles.photoDots}>
              {photoModal.photos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.photoDot, i === photoViewIdx && styles.photoDotActive]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // ── Frosted header ─────────────────────────────────────────
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
  editBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },

  // ── Player switcher ────────────────────────────────────────
  switcherBar: {
    borderBottomWidth: 1,
  },
  switcherContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  switcherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  switcherAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  switcherName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
  },

  // ── Hero ───────────────────────────────────────────────────
  // Hero section keeps hardcoded dark styling for text readability on images
  hero: {
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: '#EF4444',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  verifiedText: {
    fontSize: 9,
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.heading,
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  heroName: {
    fontSize: FontSize.xxxl,
    fontFamily: Fonts.headingBlack,
    color: '#FFFFFF',
    lineHeight: FontSize.xxxl * 1.1,
  },
  heroSchool: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
    color: '#94A3B8',
    marginTop: 2,
  },
  heroTeam: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: '#64748B',
    marginTop: 1,
  },
  heroLocation: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: '#64748B',
  },

  // ── Athlete info ───────────────────────────────────────────
  infoRowLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  infoLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoLinkArrow: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
  },
  transcriptBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  transcriptBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  socialBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  socialBtnText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
    letterSpacing: 0.3,
  },
  socialLogoImg: {
    width: 16,
    height: 16,
    marginBottom: 2,
  },
  socialLogoX: {
    fontSize: 15,
    fontFamily: Fonts.headingBlack,
    marginBottom: 2,
    lineHeight: 18,
  },

  // ── Cards ──────────────────────────────────────────────────
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  cardLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.heading,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },

  // ── Info grid ──────────────────────────────────────────────
  infoGrid: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
  },
  infoValue: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },

  // ── Season stats ───────────────────────────────────────────
  mainStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  bigStat: {
    alignItems: 'center',
  },
  bigStatValue: {
    fontSize: FontSize.xxxl,
    fontFamily: Fonts.headingBlack,
  },
  bigStatLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
    marginTop: 2,
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  smallStat: {
    alignItems: 'center',
  },
  smallStatValue: {
    fontSize: FontSize.xl,
    fontFamily: Fonts.heading,
  },
  smallStatLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
  },
  shootingRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  shootingStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  shootingStatValue: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
  },
  shootingStatLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  shootingDivider: {
    width: 1,
    height: 30,
  },
  gamesPlayedText: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: Spacing.sm,
  },
  noData: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    fontStyle: 'italic',
  },

  // ── Bio ────────────────────────────────────────────────────
  bioText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
    lineHeight: 22,
  },

  // ── Game log ───────────────────────────────────────────────
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  gameRowLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  gameDate: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
  },
  gameTeams: {
    marginTop: 2,
  },
  gameTeamName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
  },
  gameRowStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  gameStatCol: {
    alignItems: 'center',
    minWidth: 32,
  },
  gameStatVal: {
    fontSize: FontSize.md,
    fontFamily: Fonts.heading,
  },
  gameStatLabel: {
    fontSize: 9,
    fontFamily: Fonts.body,
  },
  viewMoreBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  viewMoreText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
  },

  // ── Achievements ───────────────────────────────────────────
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  achievementChip: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  achievementTitle: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
    textAlign: 'center',
  },
  achievementEvent: {
    fontSize: 9,
    fontFamily: Fonts.body,
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Film room ──────────────────────────────────────────────
  filmSegmentRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filmSegmentBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filmSegmentLogo: {
    width: 24,
    height: 24,
  },
  filmSegmentText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
  },
  filmList: {
    marginHorizontal: -Spacing.lg,
    marginTop: Spacing.xs,
  },
  filmListContent: {
    paddingHorizontal: Spacing.lg,
    gap: FILM_EMBED_GAP,
  },
  filmVideoCard: {
    width: FILM_EMBED_WIDTH,
    height: FILM_EMBED_HEIGHT,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  // Film fallback bg — stays hardcoded dark (image/photo overlay area)
  filmFallbackBg: {
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filmFallbackLogo: {
    width: 80,
    height: 80,
  },
  filmPlayCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 48,
    height: 48,
    marginTop: -24,
    marginLeft: -24,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filmPlayTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 13,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    marginLeft: 3,
  },
  // Film card info — stays hardcoded white (text on image overlay)
  filmCardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  filmCardTitle: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: '#FFFFFF',
  },

  // ── Video modal ────────────────────────────────────────────
  // Video modal keeps hardcoded #000 background
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: '#000',
  },
  videoModalTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
    marginRight: Spacing.md,
  },
  videoModalClose: {
    padding: Spacing.sm,
  },
  videoModalCloseText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontFamily: Fonts.heading,
  },
  videoPlayer: {
    flex: 1,
  },

  // ── Photos ─────────────────────────────────────────────────
  photosSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  photosSectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.heading,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoThumb: {
    borderRadius: BorderRadius.md,
  },

  // ── Photo lightbox modal ────────────────────────────────────
  // Photo lightbox keeps hardcoded dark background
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 10,
    padding: Spacing.sm,
  },
  photoModalCloseText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: Fonts.heading,
  },
  photoModalSlide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? 48 : 24,
    paddingTop: Spacing.lg,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  photoDotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
    borderRadius: 3,
  },

  // ── Empty state ────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontFamily: Fonts.heading,
  },
  emptyDesc: {
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
    textAlign: 'center',
    lineHeight: 22,
  },
});
