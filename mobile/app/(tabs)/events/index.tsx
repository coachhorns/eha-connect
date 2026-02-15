import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { eventsApi } from '@/api/events';
import { EventCard } from '@/components/EventCard';
import { Loading } from '@/components/ui/Loading';
import type { Event } from '@/types';

type Filter = 'all' | 'live' | 'upcoming' | 'completed';

export default function EventsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredEvents = React.useMemo(() => {
    if (!events) return [];
    const now = new Date();
    switch (filter) {
      case 'live':
        return events.filter(e => e.status === 'ACTIVE');
      case 'upcoming':
        return events.filter(e => e.status === 'PUBLISHED' && new Date(e.startDate) > now);
      case 'completed':
        return events.filter(e => e.status === 'COMPLETED');
      default:
        return events;
    }
  }, [events, filter]);

  if (isLoading) {
    return <Loading message="Loading events..." />;
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'live', label: 'Live' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Past' },
  ];

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        {filters.map(f => (
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

      <FlatList
        data={filteredEvents}
        keyExtractor={(item: Event) => item.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => router.push(`/(tabs)/events/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No events found</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.red,
    borderColor: Colors.red,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.textPrimary,
  },
  list: {
    padding: Spacing.lg,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
});
