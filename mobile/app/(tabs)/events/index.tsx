import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useRouter, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';
import { eventsApi } from '@/api/events';
import { EventCard } from '@/components/EventCard';
import { Loading } from '@/components/ui/Loading';
import type { Event } from '@/types';

type Filter = 'all' | 'live' | 'upcoming' | 'completed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: '● Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Past' },
];

const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 80;
const CONTROLS_HEIGHT = 110;

export default function EventsScreen() {
  const router     = useRouter();
  const navigation = useNavigation();
  const colors     = useColors();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // When the Events tab icon is tapped while already on this tab,
  // pop the stack back to this root screen.
  useEffect(() => {
    const unsub = navigation.addListener('tabPress' as any, () => {
      if (navigation.canGoBack()) {
        navigation.popToTop();
      }
    });
    return unsub;
  }, [navigation]);

  const controlsAnim = useRef(new Animated.Value(0)).current;
  const prevScrollY = useRef(0);

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - prevScrollY.current;

    if (diff > 5 && currentY > CONTROLS_HEIGHT) {
      Animated.timing(controlsAnim, {
        toValue: -CONTROLS_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else if (diff < -5) {
      Animated.timing(controlsAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }

    prevScrollY.current = currentY;
  };

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    const now = new Date();
    let result = events;

    switch (filter) {
      case 'live':
        result = events.filter(e => e.isActive && new Date(e.startDate) <= now && new Date(e.endDate) >= now);
        break;
      case 'upcoming':
        result = events.filter(e => new Date(e.startDate) > now);
        break;
      case 'completed':
        result = events.filter(e => new Date(e.endDate) < now);
        break;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        e =>
          e.name.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q) ||
          e.state?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [events, filter, search]);

  if (isLoading) {
    return <Loading message="Loading events..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── FROSTED GLASS HEADER (always visible) ── */}
      <View style={[styles.stickyHeader, { height: HEADER_HEIGHT }]}>
        <BlurView intensity={80} tint={colors.glassTint} style={StyleSheet.absoluteFill}>
          <View style={[styles.headerInner, { paddingTop: Platform.OS === 'ios' ? 50 : 30, backgroundColor: colors.headerOverlay }]}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../../assets/eha-connect-logo.png')}
                style={styles.headerLogo}
                contentFit="contain"
              />
              <Text style={[styles.headerName, { color: colors.textPrimary }]}>Events</Text>
            </View>
          </View>
        </BlurView>
        <View style={[styles.headerBorder, { backgroundColor: colors.headerBorder }]} />
      </View>

      {/* ── COLLAPSIBLE SEARCH + FILTERS ── */}
      <Animated.View
        style={[
          styles.controlsContainer,
          { top: HEADER_HEIGHT, transform: [{ translateY: controlsAnim }] },
        ]}
      >
        <BlurView intensity={80} tint={colors.glassTint} style={StyleSheet.absoluteFill} />
        <View style={[styles.controlsOverlay, { backgroundColor: colors.headerOverlay }]} />

        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.inputOverlay, borderColor: colors.inputBorder }]}>
            <Text style={[styles.searchIcon, { color: colors.textMuted }]}>⌕</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search events, cities..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.clearIcon, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                { backgroundColor: colors.inputOverlay, borderColor: colors.inputBorder },
                filter === f.key && { backgroundColor: colors.red, borderColor: colors.red },
              ]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: colors.textSecondary },
                  filter === f.key && { color: colors.textPrimary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.controlsBorder, { backgroundColor: colors.headerBorder }]} />
      </Animated.View>

      {/* ── EVENT LIST ── */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item: Event) => item.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => router.push(`/(tabs)/events/${item.id}`)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingTop: HEADER_HEIGHT + CONTROLS_HEIGHT + Spacing.md },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏀</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No events found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {search.trim()
                ? 'Try a different search term'
                : 'Check back soon for upcoming events'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.red} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  // Collapsible controls
  controlsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: CONTROLS_HEIGHT,
    zIndex: 99,
    overflow: 'hidden',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  searchRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
  },
  clearIcon: {
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
  },

  // List
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    textAlign: 'center',
  },
});
