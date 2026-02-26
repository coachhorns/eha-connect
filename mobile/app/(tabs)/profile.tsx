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
import { Colors, Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
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

// ── Sub-components ────────────────────────────────────────────

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
    </View>
  );
}

function BigStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.bigStat}>
      <Text style={[styles.bigStatValue, highlight && styles.bigStatHighlight]}>{value}</Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.smallStat}>
      <Text style={styles.smallStatValue}>{value}</Text>
      <Text style={styles.smallStatLabel}>{label}</Text>
    </View>
  );
}

function ShootingStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.shootingStatItem}>
      <Text style={styles.shootingStatValue}>{value}</Text>
      <Text style={styles.shootingStatLabel}>{label}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [filmSegment, setFilmSegment] = useState<'youtube' | 'hudl' | 'other'>('youtube');
  const [videoModal, setVideoModal] = useState<{ title: string; ytId?: string; embedUrl?: string } | null>(null);
  const [photoModal, setPhotoModal] = useState<{ photos: any[]; idx: number } | null>(null);
  const [photoViewIdx, setPhotoViewIdx] = useState(0);

  // Reset to first player on tab re-tap
  useEffect(() => {
    const unsub = navigation.addListener('tabPress' as any, () => {
      setSelectedIdx(0);
    });
    return unsub;
  }, [navigation]);

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
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Player Profile</Text>
        <Text style={styles.emptyDesc}>
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

  // ── Build film items (deduplicated by URL) ─────────────────
  const filmItemsMap = new Map<string, FilmItem>();

  if (p.youtubeUrl) {
    const ytId = extractYouTubeId(p.youtubeUrl);
    if (ytId) {
      filmItemsMap.set(p.youtubeUrl, {
        id: 'yt-direct',
        url: p.youtubeUrl,
        title: 'YouTube Highlights',
        thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
        type: 'youtube',
      });
    }
  }
  if (p.hudlUrl) {
    filmItemsMap.set(p.hudlUrl, {
      id: 'hudl-direct',
      url: p.hudlUrl,
      title: 'Hudl Highlights',
      thumbnail: null,
      type: 'hudl',
    });
  }
  if (p.highlightUrl && !filmItemsMap.has(p.highlightUrl)) {
    const ytId = extractYouTubeId(p.highlightUrl);
    filmItemsMap.set(p.highlightUrl, {
      id: 'highlight-direct',
      url: p.highlightUrl,
      title: 'Highlight Reel',
      thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null,
      type: ytId ? 'youtube' : p.highlightUrl.includes('hudl.com') ? 'hudl' : 'other',
    });
  }
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
    Linking.openURL(item.url);
  };

  const openPhoto = (idx: number) => {
    setPhotoViewIdx(idx);
    setPhotoModal({ photos: photos.slice(0, 6), idx });
  };

  return (
    <View style={styles.container}>
      {/* ── FROSTED GLASS HEADER ──────────────────────────── */}
      <View style={[styles.stickyHeader, { height: HEADER_HEIGHT }]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={[styles.headerInner, { paddingTop: Platform.OS === 'ios' ? 50 : 30 }]}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/eha-connect-logo.png')}
                style={styles.headerLogo}
                contentFit="contain"
              />
              <Text style={styles.headerName}>My Profile</Text>
            </View>
            {selectedBase && (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push({ pathname: '/players/edit', params: { id: selectedBase.id, slug: selectedBase.slug } })}
                activeOpacity={0.7}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
        <View style={styles.headerBorder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />
        }
      >
        {/* ── Player switcher (parents with multiple players only) */}
        {showSwitcher && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.switcherBar}
            contentContainerStyle={styles.switcherContent}
          >
            {allPlayers.map((pl, idx) => (
              <TouchableOpacity
                key={pl.id}
                style={[styles.switcherChip, idx === selectedIdx && styles.switcherChipActive]}
                onPress={() => setSelectedIdx(idx)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: (pl as any).profilePhoto ?? pl.profileImageUrl ?? undefined }}
                  style={styles.switcherAvatar}
                  contentFit="cover"
                />
                <Text style={[styles.switcherName, idx === selectedIdx && styles.switcherNameActive]}>
                  {pl.firstName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Hero Photo ────────────────────────────────────── */}
        <View style={[styles.hero, { height: HERO_HEIGHT }]}>
          <Image
            source={{ uri: p.profilePhoto ?? p.profileImageUrl ?? undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={['transparent', 'rgba(15,23,42,0.65)', Colors.background]}
            locations={[0.35, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓  VERIFIED ATHLETE</Text>
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
          <Text style={styles.cardLabel}>ATHLETE INFO</Text>
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
                style={styles.infoRowLink}
                onPress={() => Linking.openURL(p.maxPrepsUrl)}
                activeOpacity={0.7}
              >
                <View style={styles.infoLinkLeft}>
                  <View style={[styles.brandDot, { backgroundColor: '#005CA9' }]} />
                  <Text style={styles.infoLabel}>MaxPreps</Text>
                </View>
                <Text style={styles.infoLinkArrow}>View Profile  ↗</Text>
              </TouchableOpacity>
            )}
          </View>
          {p.transcriptUrl && (
            <TouchableOpacity
              style={styles.transcriptBtn}
              onPress={() => Linking.openURL(p.transcriptUrl)}
              activeOpacity={0.7}
            >
              <Text style={styles.transcriptBtnText}>Download Transcript (PDF)</Text>
            </TouchableOpacity>
          )}
          {(twitterUrl || instagramUrl) && (
            <View style={styles.socialRow}>
              {twitterUrl && (
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={() => Linking.openURL(twitterUrl!)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.socialLogoX}>𝕏</Text>
                  <Text style={styles.socialBtnText}>Twitter / X</Text>
                </TouchableOpacity>
              )}
              {instagramUrl && (
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={() => Linking.openURL(instagramUrl!)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={require('../../assets/logos/instagram.png')}
                    style={styles.socialLogoImg}
                    contentFit="contain"
                    tintColor="#FFFFFF"
                  />
                  <Text style={styles.socialBtnText}>Instagram</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card>

        {/* ── Season Stats ──────────────────────────────────── */}
        <Card style={styles.card}>
          <Text style={styles.cardLabel}>SEASON AVERAGES</Text>
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
              <View style={styles.shootingRow}>
                <ShootingStat label="FG%" value={`${player.careerStats.shooting.fgPct.toFixed(1)}%`} />
                <View style={styles.shootingDivider} />
                <ShootingStat label="3PT%" value={`${player.careerStats.shooting.fg3Pct.toFixed(1)}%`} />
                <View style={styles.shootingDivider} />
                <ShootingStat label="FT%" value={`${player.careerStats.shooting.ftPct.toFixed(1)}%`} />
              </View>
              <Text style={styles.gamesPlayedText}>{player.careerStats.gamesPlayed} games played</Text>
            </>
          ) : (
            <Text style={styles.noData}>No stats recorded yet</Text>
          )}
        </Card>

        {/* ── Bio ───────────────────────────────────────────── */}
        {p.bio ? (
          <Card style={styles.card}>
            <Text style={styles.cardLabel}>ABOUT</Text>
            <Text style={styles.bioText}>{p.bio}</Text>
          </Card>
        ) : null}

        {/* ── Recent Game Log ───────────────────────────────── */}
        {p.gameStats && p.gameStats.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardLabel}>RECENT GAMES</Text>
            {(p.gameStats as any[]).slice(0, 5).map((stat: any) => {
              const dateStr = stat.game?.scheduledAt
                ? format(new Date(stat.game.scheduledAt), 'MMM d')
                : '—';
              const eventName = stat.game?.event?.name ?? null;
              return (
                <View key={stat.id} style={styles.gameRow}>
                  <View style={styles.gameRowLeft}>
                    <Text style={styles.gameDate}>{dateStr}{eventName ? `  ·  ${eventName}` : ''}</Text>
                    <View style={styles.gameTeams}>
                      <Text style={styles.gameTeamName} numberOfLines={1}>
                        {stat.game?.homeTeam?.name ?? '—'} vs {stat.game?.awayTeam?.name ?? '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.gameRowStats}>
                    <View style={styles.gameStatCol}>
                      <Text style={styles.gameStatVal}>{stat.points}</Text>
                      <Text style={styles.gameStatLabel}>PTS</Text>
                    </View>
                    <View style={styles.gameStatCol}>
                      <Text style={styles.gameStatVal}>{stat.rebounds}</Text>
                      <Text style={styles.gameStatLabel}>REB</Text>
                    </View>
                    <View style={styles.gameStatCol}>
                      <Text style={styles.gameStatVal}>{stat.assists}</Text>
                      <Text style={styles.gameStatLabel}>AST</Text>
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
                <Text style={styles.viewMoreText}>View Full Game Log →</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* ── Achievements ──────────────────────────────────── */}
        {p.achievements && (p.achievements as any[]).length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardLabel}>ACHIEVEMENTS</Text>
            <View style={styles.achievementsGrid}>
              {(p.achievements as any[]).slice(0, 6).map((a: any) => (
                <View key={a.id} style={[styles.achievementChip, { width: ACHIEVEMENT_SIZE }]}>
                  <Text style={styles.achievementIcon}>🏆</Text>
                  <Text style={styles.achievementTitle} numberOfLines={2}>{a.title}</Text>
                  {a.eventName && (
                    <Text style={styles.achievementEvent} numberOfLines={1}>{a.eventName}</Text>
                  )}
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* ── Film Room ─────────────────────────────────────── */}
        {filmItems.length > 0 && (() => {
          const types = [...new Set(filmItems.map(i => i.type))] as ('youtube' | 'hudl' | 'other')[];
          const activeSegment = types.includes(filmSegment) ? filmSegment : types[0];
          const activeItems = filmItems.filter(i => i.type === activeSegment);
          return (
            <Card style={styles.card}>
              <Text style={styles.cardLabel}>FILM ROOM</Text>
              {/* Logo toggle buttons */}
              {types.length > 1 && (
                <View style={styles.filmSegmentRow}>
                  {types.map(t => {
                    const isActive = t === activeSegment;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.filmSegmentBtn, isActive && styles.filmSegmentBtnActive]}
                        onPress={() => setFilmSegment(t)}
                        activeOpacity={0.7}
                      >
                        {t === 'youtube' && (
                          <Image
                            source={require('../../assets/logos/youtube.png')}
                            style={styles.filmSegmentLogo}
                            contentFit="contain"
                          />
                        )}
                        {t === 'hudl' && (
                          <Image
                            source={require('../../assets/logos/hudl.png')}
                            style={styles.filmSegmentLogo}
                            contentFit="contain"
                          />
                        )}
                        {t === 'other' && (
                          <Text style={[styles.filmSegmentText, isActive && styles.filmSegmentTextActive]}>
                            Video
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {/* Swipeable thumbnail cards */}
              <FlatList
                horizontal
                data={activeItems}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                snapToInterval={FILM_EMBED_WIDTH + FILM_EMBED_GAP}
                decelerationRate="fast"
                style={styles.filmList}
                contentContainerStyle={styles.filmListContent}
                scrollEnabled={activeItems.length > 1}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.filmVideoCard}
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
                        {item.type === 'hudl' && (
                          <Image
                            source={require('../../assets/logos/hudl.png')}
                            style={styles.filmFallbackLogo}
                            contentFit="contain"
                          />
                        )}
                      </View>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.75)']}
                      style={StyleSheet.absoluteFill}
                    />
                    {/* Play button */}
                    <View style={styles.filmPlayCircle}>
                      <View style={styles.filmPlayTriangle} />
                    </View>
                    {/* Title */}
                    <View style={styles.filmCardInfo}>
                      <Text style={styles.filmCardTitle} numberOfLines={1}>{item.title}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </Card>
          );
        })()}

        {/* ── Photos ────────────────────────────────────────── */}
        {photos.length > 0 && (
          <View style={styles.photosSection}>
            <Text style={styles.photosSectionLabel}>PHOTOS</Text>
            <View style={styles.photosGrid}>
              {photos.slice(0, 6).map((photo: any, idx: number) => (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => openPhoto(idx)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={[styles.photoThumb, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Video Player Modal ────────────────────────────── */}
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
              <Text style={styles.videoModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.videoPlayer}>
            {videoModal?.ytId ? (
              <WebView
                source={{ uri: `https://www.youtube.com/watch?v=${videoModal.ytId}` }}
                style={{ flex: 1, backgroundColor: '#000' }}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                injectedJavaScript={`
                  (function() {
                    var style = document.createElement('style');
                    style.textContent = 'ytm-related-video-list-renderer, .related-chips-slot-wrapper, ytm-comments-entry-point-header-renderer, ytm-item-section-renderer, .watch-below-the-player { display: none !important; } #player { position: fixed !important; top: 0; left: 0; width: 100vw !important; height: 100vh !important; z-index: 9999; background: #000; }';
                    document.head.appendChild(style);
                  })();
                  true;
                `}
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
            <Text style={styles.photoModalCloseText}>✕</Text>
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
    backgroundColor: Colors.background,
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
  headerName: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.headingBlack,
    color: Colors.textPrimary,
    marginTop: -1,
  },
  editBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  editBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },

  // ── Player switcher ────────────────────────────────────────
  switcherBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    borderColor: Colors.border,
  },
  switcherChipActive: {
    borderColor: Colors.red,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  switcherAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
  },
  switcherName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },
  switcherNameActive: {
    color: Colors.red,
    fontFamily: Fonts.bodySemiBold,
  },

  // ── Hero ───────────────────────────────────────────────────
  hero: {
    width: SCREEN_WIDTH,
    backgroundColor: Colors.surfaceLight,
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.red,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  verifiedText: {
    fontSize: 9,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
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
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  heroName: {
    fontSize: FontSize.xxxl,
    fontFamily: Fonts.headingBlack,
    color: Colors.textPrimary,
    lineHeight: FontSize.xxxl * 1.1,
  },
  heroSchool: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  heroTeam: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 1,
  },
  heroLocation: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },

  // ── Athlete info ───────────────────────────────────────────
  infoRowLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    color: Colors.textMuted,
  },
  transcriptBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  transcriptBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
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
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  socialBtnText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
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
    color: Colors.gold,
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
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textMuted,
  },
  infoValue: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  infoValueHighlight: {
    color: Colors.gold,
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
    color: Colors.textPrimary,
  },
  bigStatHighlight: {
    color: Colors.red,
  },
  bigStatLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textMuted,
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
    color: Colors.textPrimary,
  },
  smallStatLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  shootingRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
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
    color: Colors.textPrimary,
  },
  shootingStatLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  shootingDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  gamesPlayedText: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  noData: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // ── Bio ────────────────────────────────────────────────────
  bioText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // ── Game log ───────────────────────────────────────────────
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  gameRowLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  gameDate: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  gameTeams: {
    marginTop: 2,
  },
  gameTeamName: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
  },
  gameStatLabel: {
    fontSize: 9,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  viewMoreBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  viewMoreText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
    color: Colors.red,
  },

  // ── Achievements ───────────────────────────────────────────
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  achievementChip: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  achievementEvent: {
    fontSize: 9,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filmSegmentBtnActive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  filmSegmentLogo: {
    width: 24,
    height: 24,
  },
  filmSegmentText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecondary,
  },
  filmSegmentTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: Colors.surfaceLight,
  },
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
    color: Colors.textPrimary,
  },

  // ── Video modal ────────────────────────────────────────────
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
    color: Colors.textPrimary,
    marginRight: Spacing.md,
  },
  videoModalClose: {
    padding: Spacing.sm,
  },
  videoModalCloseText: {
    fontSize: 20,
    color: Colors.textPrimary,
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
    color: Colors.gold,
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
    backgroundColor: Colors.surfaceLight,
  },

  // ── Photo lightbox modal ────────────────────────────────────
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
    color: Colors.textPrimary,
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
    backgroundColor: Colors.textPrimary,
    width: 18,
    borderRadius: 3,
  },

  // ── Empty state ────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
