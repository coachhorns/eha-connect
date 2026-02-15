import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { eventsApi } from '@/api/events';
import { GameCard } from '@/components/GameCard';
import { Loading } from '@/components/ui/Loading';

type Tab = 'schedule' | 'standings' | 'results';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('schedule');

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id),
  });

  const { data: games, refetch: refetchGames } = useQuery({
    queryKey: ['event-games', id],
    queryFn: () => eventsApi.getGames(id),
    enabled: activeTab === 'schedule',
  });

  const { data: standings } = useQuery({
    queryKey: ['event-standings', id],
    queryFn: () => eventsApi.getStandings(id),
    enabled: activeTab === 'standings',
  });

  const { data: results } = useQuery({
    queryKey: ['event-results', id],
    queryFn: () => eventsApi.getResults(id),
    enabled: activeTab === 'results',
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetchGames();
    setRefreshing(false);
  };

  if (isLoading || !event) {
    return <Loading message="Loading event..." />;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'schedule', label: 'Schedule' },
    { key: 'standings', label: 'Standings' },
    { key: 'results', label: 'Results' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />
      }
    >
      {/* Event Header */}
      {event.imageUrl && (
        <Image source={{ uri: event.imageUrl }} style={styles.heroImage} contentFit="cover" />
      )}
      <View style={styles.header}>
        <View style={styles.badges}>
          {event.status === 'ACTIVE' && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          {event.ncaaCertified && (
            <View style={styles.ncaaBadge}>
              <Text style={styles.ncaaText}>NCAA CERTIFIED</Text>
            </View>
          )}
        </View>
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.eventDate}>
          {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
        </Text>
        {event.city && event.state && (
          <Text style={styles.eventLocation}>{event.city}, {event.state}</Text>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'schedule' && (
          <View style={styles.gamesList}>
            {games?.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
            {games?.length === 0 && (
              <Text style={styles.emptyText}>No games scheduled yet</Text>
            )}
          </View>
        )}

        {activeTab === 'standings' && (
          <View style={styles.standingsTable}>
            <View style={styles.standingsHeader}>
              <Text style={[styles.standingsCell, styles.teamCell, styles.headerText]}>Team</Text>
              <Text style={[styles.standingsCell, styles.headerText]}>W</Text>
              <Text style={[styles.standingsCell, styles.headerText]}>L</Text>
              <Text style={[styles.standingsCell, styles.headerText]}>PF</Text>
              <Text style={[styles.standingsCell, styles.headerText]}>PA</Text>
            </View>
            {standings?.map((s, i) => (
              <View key={s.team.id} style={[styles.standingsRow, i % 2 === 0 && styles.standingsRowAlt]}>
                <Text style={[styles.standingsCell, styles.teamCell, styles.teamText]} numberOfLines={1}>
                  {s.team.name}
                </Text>
                <Text style={styles.standingsCell}>{s.wins}</Text>
                <Text style={styles.standingsCell}>{s.losses}</Text>
                <Text style={styles.standingsCell}>{s.pointsFor}</Text>
                <Text style={styles.standingsCell}>{s.pointsAgainst}</Text>
              </View>
            ))}
            {standings?.length === 0 && (
              <Text style={styles.emptyText}>No standings available yet</Text>
            )}
          </View>
        )}

        {activeTab === 'results' && (
          <View style={styles.gamesList}>
            {results?.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
            {results?.length === 0 && (
              <Text style={styles.emptyText}>No results yet</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroImage: {
    width: '100%',
    height: 200,
  },
  header: {
    padding: Spacing.lg,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textPrimary,
  },
  liveText: {
    color: Colors.textPrimary,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  ncaaBadge: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  ncaaText: {
    color: Colors.gold,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  eventName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  eventDate: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  eventLocation: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.red,
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.textPrimary,
  },
  tabContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  gamesList: {
    gap: Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingVertical: 40,
  },
  standingsTable: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  standingsHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.navy,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  standingsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  standingsRowAlt: {
    backgroundColor: Colors.surfaceLight,
  },
  standingsCell: {
    width: 40,
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  teamCell: {
    flex: 1,
    textAlign: 'left',
    width: undefined,
  },
  headerText: {
    fontWeight: '700',
    color: Colors.textPrimary,
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  teamText: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
