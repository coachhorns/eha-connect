import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { eventsApi } from '@/api/events';
import { playersApi } from '@/api/players';
import { EventCard } from '@/components/EventCard';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
  });

  const { data: myPlayers, refetch: refetchPlayers } = useQuery({
    queryKey: ['myPlayers'],
    queryFn: playersApi.getMyPlayers,
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchPlayers()]);
    setRefreshing(false);
  };

  // Get upcoming / active events
  const activeEvents = events?.filter(e => e.status === 'ACTIVE') ?? [];
  const upcomingEvents = events
    ?.filter(e => e.status === 'PUBLISHED' && new Date(e.startDate) > new Date())
    ?.slice(0, 3) ?? [];

  if (eventsLoading) {
    return <Loading message="Loading..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.red}
        />
      }
    >
      {/* Welcome */}
      <View style={styles.welcome}>
        <Text style={styles.greeting}>
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </Text>
        <Text style={styles.subtitle}>EHA Connect</Text>
      </View>

      {/* Quick Stats */}
      {myPlayers && myPlayers.length > 0 && (
        <Card variant="navy" style={styles.quickStats}>
          <Text style={styles.sectionLabel}>MY PLAYERS</Text>
          {myPlayers.map(player => (
            <TouchableOpacity
              key={player.id}
              style={styles.playerQuick}
              onPress={() => router.push(`/players/${player.slug}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.playerQuickName}>
                {player.firstName} {player.lastName}
              </Text>
              <Text style={styles.playerQuickPos}>{player.position}</Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {/* Live Events */}
      {activeEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>Live Now</Text>
            </View>
          </View>
          <View style={styles.eventsList}>
            {activeEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/(tabs)/events/${event.id}`)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.eventsList}>
            {upcomingEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/(tabs)/events/${event.id}`)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/leaderboards')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionEmoji}>&#127942;</Text>
            <Text style={styles.actionLabel}>Leaderboards</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/events')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionEmoji}>&#128197;</Text>
            <Text style={styles.actionLabel}>All Events</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionEmoji}>&#128100;</Text>
            <Text style={styles.actionLabel}>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/more')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionEmoji}>&#9881;</Text>
            <Text style={styles.actionLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  welcome: {
    marginBottom: Spacing.xxl,
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.red,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 2,
  },
  quickStats: {
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gold,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  playerQuick: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight,
  },
  playerQuickName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  playerQuickPos: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
  },
  seeAll: {
    fontSize: FontSize.sm,
    color: Colors.red,
    fontWeight: '600',
  },
  eventsList: {
    gap: Spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    width: '47%',
    aspectRatio: 1.4,
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
