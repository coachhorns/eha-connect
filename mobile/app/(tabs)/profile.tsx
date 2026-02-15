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
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { playersApi } from '@/api/players';
import { StatBox } from '@/components/ui/StatBox';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: myPlayers, isLoading, refetch } = useQuery({
    queryKey: ['myPlayers'],
    queryFn: playersApi.getMyPlayers,
  });

  const { data: guardedPlayers } = useQuery({
    queryKey: ['guardedPlayers'],
    queryFn: playersApi.getGuardedPlayers,
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Combine owned + guarded players
  const allPlayers = [...(myPlayers ?? []), ...(guardedPlayers ?? [])];
  const primaryPlayer = allPlayers[0];

  if (isLoading) {
    return <Loading message="Loading profile..." />;
  }

  if (!primaryPlayer) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Player Profile</Text>
        <Text style={styles.emptyDesc}>
          You don't have a player profile linked to your account yet.
        </Text>
        <Button title="Find My Profile" onPress={() => router.push('/(tabs)/more')} />
      </View>
    );
  }

  const heightDisplay = primaryPlayer.heightInches
    ? `${Math.floor(primaryPlayer.heightInches / 12)}'${primaryPlayer.heightInches % 12}"`
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />
      }
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Image
          source={{ uri: primaryPlayer.profileImageUrl ?? undefined }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
        />
        <Text style={styles.playerName}>
          {primaryPlayer.firstName} {primaryPlayer.lastName}
        </Text>
        <View style={styles.metaRow}>
          {primaryPlayer.position && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{primaryPlayer.position}</Text>
            </View>
          )}
          {primaryPlayer.graduationYear && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Class of {primaryPlayer.graduationYear}</Text>
            </View>
          )}
        </View>
        {primaryPlayer.school && (
          <Text style={styles.school}>{primaryPlayer.school}</Text>
        )}
        {primaryPlayer.city && primaryPlayer.state && (
          <Text style={styles.location}>{primaryPlayer.city}, {primaryPlayer.state}</Text>
        )}
      </View>

      {/* Physical */}
      <View style={styles.physicalRow}>
        {heightDisplay && <StatBox label="Height" value={heightDisplay} />}
        {primaryPlayer.weight && <StatBox label="Weight" value={`${primaryPlayer.weight}`} />}
        {primaryPlayer.gpa && <StatBox label="GPA" value={primaryPlayer.gpa.toFixed(1)} highlight />}
      </View>

      {/* Bio */}
      {primaryPlayer.bio && (
        <Card style={styles.bioCard}>
          <Text style={styles.bioLabel}>ABOUT</Text>
          <Text style={styles.bioText}>{primaryPlayer.bio}</Text>
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="View Full Profile"
          onPress={() => router.push(`/players/${primaryPlayer.slug}`)}
          variant="outline"
        />
        <Button
          title="Edit Profile"
          onPress={() => router.push('/(tabs)/more')}
          variant="ghost"
        />
      </View>

      {/* Other Players (if parent with multiple) */}
      {allPlayers.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Players</Text>
          {allPlayers.slice(1).map(player => (
            <TouchableOpacity
              key={player.id}
              style={styles.otherPlayer}
              onPress={() => router.push(`/players/${player.slug}`)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: player.profileImageUrl ?? undefined }}
                style={styles.otherAvatar}
                contentFit="cover"
              />
              <View>
                <Text style={styles.otherName}>{player.firstName} {player.lastName}</Text>
                <Text style={styles.otherMeta}>{player.position}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceLight,
    marginBottom: Spacing.lg,
    borderWidth: 3,
    borderColor: Colors.red,
  },
  playerName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  school: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  location: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  physicalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  bioCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  bioLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  bioText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  otherPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  otherAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
  },
  otherName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  otherMeta: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
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
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
