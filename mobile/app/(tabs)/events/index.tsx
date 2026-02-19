import React, { useState, useMemo, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
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
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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
    <View style={styles.container}>
      {/* ── FROSTED GLASS HEADER (always visible) ── */}
      <View style={[styles.stickyHeader, { height: HEADER_HEIGHT }]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={[styles.headerInner, { paddingTop: Platform.OS === 'ios' ? 50 : 30 }]}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../../assets/eha-connect-logo.png')}
                style={styles.headerLogo}
                contentFit="contain"
              />
              <Text style={styles.headerName}>Events</Text>
            </View>
          </View>
        </BlurView>
        <View style={styles.headerBorder} />
      </View>

      {/* ── COLLAPSIBLE SEARCH + FILTERS ── */}
      <Animated.View
        style={[
          styles.controlsContainer,
          { top: HEADER_HEIGHT, transform: [{ translateY: controlsAnim }] },
        ]}
      >
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.controlsOverlay} />

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, cities..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.controlsBorder} />
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
            <Text style={styles.emptyTitle}>No events found</Text>
            <Text style={styles.emptySubtitle}>
              {search.trim()
                ? 'Try a different search term'
                : 'Check back soon for upcoming events'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />
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
    backgroundColor: Colors.background,
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
  headerName: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.headingBlack,
    color: Colors.textPrimary,
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
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  controlsBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
  },
  clearIcon: {
    fontSize: 13,
    color: Colors.textMuted,
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
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: Colors.red,
    borderColor: Colors.red,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
