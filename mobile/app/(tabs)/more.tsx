import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { subscriptionApi } from '@/api/subscription';
import { Card } from '@/components/ui/Card';

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

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getStatus,
    retry: false,
  });

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  const handleManageSubscription = async () => {
    try {
      const { url } = await subscriptionApi.createCheckout('manage');
      if (url) {
        Linking.openURL(url);
      }
    } catch {
      Alert.alert('Error', 'Unable to open subscription management.');
    }
  };

  const planLabel = subscription?.plan
    ? `${subscription.plan} Plan`
    : 'Free';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Account Card */}
      <Card variant="navy" style={styles.accountCard}>
        <View style={styles.accountInfo}>
          <View style={styles.accountAvatar}>
            <Text style={styles.accountInitial}>
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View style={styles.accountDetails}>
            <Text style={styles.accountName}>{user?.name ?? 'User'}</Text>
            <Text style={styles.accountEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role?.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Subscription */}
      <SectionHeader title="SUBSCRIPTION" colors={colors} />
      <Card>
        <View style={styles.subRow}>
          <View>
            <Text style={[styles.subPlan, { color: colors.textPrimary }]}>{planLabel}</Text>
            <Text style={styles.subStatus}>
              {subscription?.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.manageBtn, { backgroundColor: colors.surfaceLight }]}
            onPress={handleManageSubscription}
          >
            <Text style={[styles.manageBtnText, { color: colors.textPrimary }]}>Manage</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Teams (for directors) */}
      {(user?.role === 'PROGRAM_DIRECTOR' || user?.role === 'ADMIN') && (
        <>
          <SectionHeader title="PROGRAM" colors={colors} />
          <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MenuItem label="My Teams" sublabel="Manage your rosters" onPress={() => {}} colors={colors} />
            <MenuItem label="Recruiting" sublabel="College coach outreach" onPress={() => {}} colors={colors} />
          </View>
        </>
      )}

      {/* Appearance */}
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

      {/* General */}
      <SectionHeader title="GENERAL" colors={colors} />
      <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MenuItem label="Notifications" sublabel="Push notification settings" onPress={() => {}} colors={colors} />
        <MenuItem label="Privacy Policy" onPress={() => Linking.openURL('https://ehaconnect.com/privacy')} colors={colors} />
        <MenuItem label="Terms of Service" onPress={() => Linking.openURL('https://ehaconnect.com/terms')} colors={colors} />
      </View>

      {/* Sign Out */}
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
  },
  accountInitial: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accountEmail: {
    fontSize: FontSize.sm,
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
    fontWeight: '600',
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: '700',
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
    fontWeight: '600',
  },
  menuItemSublabel: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  menuArrow: {
    fontSize: FontSize.xl,
    fontWeight: '300',
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subPlan: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  subStatus: {
    fontSize: FontSize.sm,
    color: '#10B981',
    fontWeight: '500',
    marginTop: 2,
  },
  manageBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  manageBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  signOutBtn: {
    marginTop: Spacing.xxxl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    marginTop: Spacing.xl,
  },
});
