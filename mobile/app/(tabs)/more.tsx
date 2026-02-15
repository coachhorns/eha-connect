import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { subscriptionApi } from '@/api/subscription';
import { Card } from '@/components/ui/Card';

function MenuItem({ label, sublabel, onPress }: { label: string; sublabel?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemLabel}>{label}</Text>
        {sublabel && <Text style={styles.menuItemSublabel}>{sublabel}</Text>}
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function MoreScreen() {
  const { user, signOut } = useAuth();
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
      <SectionHeader title="SUBSCRIPTION" />
      <Card>
        <View style={styles.subRow}>
          <View>
            <Text style={styles.subPlan}>{planLabel}</Text>
            <Text style={styles.subStatus}>
              {subscription?.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <TouchableOpacity style={styles.manageBtn} onPress={handleManageSubscription}>
            <Text style={styles.manageBtnText}>Manage</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Teams (for directors) */}
      {(user?.role === 'PROGRAM_DIRECTOR' || user?.role === 'ADMIN') && (
        <>
          <SectionHeader title="PROGRAM" />
          <View style={styles.menuGroup}>
            <MenuItem label="My Teams" sublabel="Manage your rosters" onPress={() => {}} />
            <MenuItem label="Recruiting" sublabel="College coach outreach" onPress={() => {}} />
          </View>
        </>
      )}

      {/* General */}
      <SectionHeader title="GENERAL" />
      <View style={styles.menuGroup}>
        <MenuItem label="Notifications" sublabel="Push notification settings" onPress={() => {}} />
        <MenuItem label="Privacy Policy" onPress={() => Linking.openURL('https://ehaconnect.com/privacy')} />
        <MenuItem label="Terms of Service" onPress={() => Linking.openURL('https://ehaconnect.com/terms')} />
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>EHA Connect v1.0.0</Text>
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
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInitial: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  accountEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: Colors.navyLight,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  roleText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuItemSublabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  menuArrow: {
    fontSize: FontSize.xl,
    color: Colors.textMuted,
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
    color: Colors.textPrimary,
  },
  subStatus: {
    fontSize: FontSize.sm,
    color: Colors.success,
    fontWeight: '500',
    marginTop: 2,
  },
  manageBtn: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  manageBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  signOutBtn: {
    marginTop: Spacing.xxxl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.error,
  },
  version: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: Spacing.xl,
  },
});
