import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useColors, useTheme } from '@/context/ThemeContext';
import { subscriptionApi } from '@/api/subscription';
import { playersApi } from '@/api/players';
import { guardiansApi } from '@/api/guardians';
import { userApi } from '@/api/user';
import { Card } from '@/components/ui/Card';
import type { GuardedPlayer } from '@/types';

function MenuItem({ label, sublabel, onPress, colors }: { label: string; sublabel?: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>{label}</Text>
        {sublabel && <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>{sublabel}</Text>}
      </View>
      <Text style={[styles.menuArrow, { color: colors.textMuted }]}>›</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{title}</Text>;
}

export default function SettingsScreen() {
  const { user, signOut, updateUser } = useAuth();
  const colors = useColors();
  const { isDark, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editEmail, setEditEmail] = useState(user?.email ?? '');

  // Data queries
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getStatus,
    retry: false,
  });

  const { data: guardedPlayers = [] } = useQuery<GuardedPlayer[]>({
    queryKey: ['guardedPlayers'],
    queryFn: playersApi.getGuardedPlayers,
    enabled: user?.role === 'PARENT' || user?.role === 'ADMIN',
  });

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string }) =>
      userApi.updateProfile(data),
    onSuccess: (response) => {
      updateUser(response.user);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to update profile.');
    },
  });

  // Unlink mutation
  const unlinkMutation = useMutation({
    mutationFn: (playerId: string) => guardiansApi.unlinkGuardian(playerId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guardedPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      Alert.alert('Unlinked', data.message);
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to unlink.');
    },
  });

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleUnlink = (player: GuardedPlayer) => {
    Alert.alert(
      'Unlink from Athlete',
      `Are you sure you want to unlink from ${player.firstName} ${player.lastName}? You will no longer be able to manage their profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => unlinkMutation.mutate(player.id),
        },
      ]
    );
  };

  const handleSaveProfile = () => {
    const updates: { name?: string; email?: string } = {};
    if (editName.trim() !== (user?.name ?? '')) updates.name = editName.trim();
    if (editEmail.trim() !== (user?.email ?? '')) updates.email = editEmail.trim();
    if (Object.keys(updates).length === 0) {
      setIsEditing(false);
      return;
    }
    profileMutation.mutate(updates);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(user?.name ?? '');
    setEditEmail(user?.email ?? '');
  };

  const planLabel = subscription?.plan
    ? `${subscription.plan} Plan`
    : 'Free';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* ── ACCOUNT CARD ──────────────────────────────── */}
      <Card variant="navy" style={styles.accountCard}>
        <TouchableOpacity
          onPress={() => setIsEditing(!isEditing)}
          activeOpacity={0.8}
          style={styles.accountInfo}
        >
          <View style={styles.accountAvatar}>
            {user?.image ? (
              <Image source={{ uri: user.image }} style={styles.accountAvatarImg} />
            ) : (
              <Text style={styles.accountInitial}>
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </Text>
            )}
          </View>
          <View style={styles.accountDetails}>
            <Text style={styles.accountName}>{user?.name ?? 'User'}</Text>
            <Text style={styles.accountEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role?.replace('_', ' ')}</Text>
            </View>
          </View>
          <Text style={{ color: '#94A3B8', fontSize: 18, fontFamily: Fonts.body }}>
            {isEditing ? '✕' : '✎'}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <View style={styles.editSection}>
            <TextInput
              style={[styles.editInput, { color: '#FFFFFF', borderColor: '#334155', backgroundColor: '#1E293B' }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Full Name"
              placeholderTextColor="#64748B"
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.editInput, { color: '#FFFFFF', borderColor: '#334155', backgroundColor: '#1E293B' }]}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Email"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={profileMutation.isPending}
                activeOpacity={0.7}
              >
                {profileMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancelEdit} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>

      {/* ── MY ATHLETES (parent/admin only) ───────────── */}
      {(user?.role === 'PARENT' || user?.role === 'ADMIN') && guardedPlayers.length > 0 && (
        <>
          <SectionHeader title="MY ATHLETES" colors={colors} />
          <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {guardedPlayers.map((player, index) => (
              <View
                key={player.id}
                style={[
                  styles.athleteRow,
                  { borderBottomColor: colors.border },
                  index === guardedPlayers.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.athleteInfo}>
                  <View style={[styles.athleteAvatar, { backgroundColor: colors.surfaceLight }]}>
                    {player.profilePhoto || player.profileImageUrl ? (
                      <Image
                        source={{ uri: player.profilePhoto || player.profileImageUrl || '' }}
                        style={styles.athleteAvatarImg}
                      />
                    ) : (
                      <Text style={[styles.athleteInitial, { color: colors.textPrimary }]}>
                        {player.firstName[0]}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.athleteName, { color: colors.textPrimary }]}>
                      {player.firstName} {player.lastName}
                    </Text>
                    <Text style={[styles.athleteMeta, { color: colors.textMuted }]}>
                      {player.teamRosters?.[0]?.team?.name ?? 'No team'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleUnlink(player)}
                  activeOpacity={0.7}
                  disabled={unlinkMutation.isPending}
                >
                  <Text style={styles.unlinkText}>Unlink</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── SUBSCRIPTION ──────────────────────────────── */}
      <SectionHeader title="SUBSCRIPTION" colors={colors} />
      <Card>
        <View style={styles.subRow}>
          <View>
            <Text style={[styles.subPlan, { color: colors.textPrimary }]}>{planLabel}</Text>
            <Text style={styles.subStatus}>
              {subscription?.status === 'active' || subscription?.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.manageBtn, { backgroundColor: colors.surfaceLight }]}
            onPress={() => Alert.alert('Coming Soon', 'Subscription management will be available soon.')}
            activeOpacity={0.7}
          >
            <Text style={[styles.manageBtnText, { color: colors.textPrimary }]}>Manage</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* ── PROGRAM (directors/admins) ────────────────── */}
      {(user?.role === 'PROGRAM_DIRECTOR' || user?.role === 'ADMIN') && (
        <>
          <SectionHeader title="PROGRAM" colors={colors} />
          <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MenuItem label="My Teams" sublabel="Manage your rosters" onPress={() => {}} colors={colors} />
            <MenuItem label="Recruiting" sublabel="College coach outreach" onPress={() => {}} colors={colors} />
          </View>
        </>
      )}

      {/* ── APPEARANCE ────────────────────────────────── */}
      <SectionHeader title="APPEARANCE" colors={colors} />
      <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
            <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
              {isDark ? 'On' : 'Off'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.surfaceElevated, true: colors.red }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* ── GENERAL ───────────────────────────────────── */}
      <SectionHeader title="GENERAL" colors={colors} />
      <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MenuItem label="Notifications" sublabel="Push notification settings" onPress={() => {}} colors={colors} />
        <MenuItem label="Privacy Policy" onPress={() => Linking.openURL('https://ehaconnect.com/privacy')} colors={colors} />
        <MenuItem label="Terms of Service" onPress={() => Linking.openURL('https://ehaconnect.com/terms')} colors={colors} />
      </View>

      {/* ── SIGN OUT ──────────────────────────────────── */}
      <TouchableOpacity style={[styles.signOutBtn, { borderColor: colors.error }]} onPress={handleSignOut} activeOpacity={0.7}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.textMuted }]}>EHA Connect v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },

  // Account card
  accountCard: {
    marginBottom: Spacing.lg,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  accountAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  accountAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  accountInitial: {
    fontSize: FontSize.xxl,
    fontFamily: Fonts.headingBlack,
    color: '#FFFFFF',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
  },
  accountEmail: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.body,
    color: '#94A3B8',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#334155',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  roleText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Profile edit
  editSection: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  editInput: {
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
  },
  editButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  saveBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
  },
  cancelBtnText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodyMedium,
    color: '#94A3B8',
  },

  // My Athletes
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  athleteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  athleteAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  athleteAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  athleteInitial: {
    fontSize: FontSize.md,
    fontFamily: Fonts.heading,
  },
  athleteName: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
  },
  athleteMeta: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 1,
  },
  unlinkText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: '#EF4444',
  },

  // Sections
  sectionHeader: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.heading,
    letterSpacing: 2,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  menuGroup: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
  },
  menuItemSublabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: 1,
  },
  menuArrow: {
    fontSize: FontSize.xl,
  },

  // Subscription
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subPlan: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.heading,
  },
  subStatus: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodyMedium,
    color: '#10B981',
    marginTop: 2,
  },
  manageBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  manageBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
  },

  // Sign out
  signOutBtn: {
    marginTop: Spacing.xxxl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    marginTop: Spacing.xl,
  },
});
