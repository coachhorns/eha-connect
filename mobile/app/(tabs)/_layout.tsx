import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/colors';

// Simple SVG-free tab icons using View components
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? Colors.red : Colors.inactiveTab;
  const size = 24;

  // Simple geometric icons
  switch (name) {
    case 'home':
      return (
        <View style={[iconStyles.house, { borderColor: color }]}>
          <View style={[iconStyles.houseRoof, { borderBottomColor: color }]} />
        </View>
      );
    case 'events':
      return (
        <View style={[iconStyles.calendar, { borderColor: color }]}>
          <View style={[iconStyles.calendarTop, { backgroundColor: color }]} />
        </View>
      );
    case 'leaderboard':
      return (
        <View style={iconStyles.barGroup}>
          <View style={[iconStyles.bar, { height: 10, backgroundColor: color }]} />
          <View style={[iconStyles.bar, { height: 16, backgroundColor: color }]} />
          <View style={[iconStyles.bar, { height: 13, backgroundColor: color }]} />
        </View>
      );
    case 'profile':
      return (
        <View>
          <View style={[iconStyles.profileHead, { backgroundColor: color }]} />
          <View style={[iconStyles.profileBody, { backgroundColor: color }]} />
        </View>
      );
    case 'more':
      return (
        <View style={iconStyles.dotsRow}>
          <View style={[iconStyles.dot, { backgroundColor: color }]} />
          <View style={[iconStyles.dot, { backgroundColor: color }]} />
          <View style={[iconStyles.dot, { backgroundColor: color }]} />
        </View>
      );
    default:
      return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
  }
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          letterSpacing: 0.5,
        },
        tabBarStyle: {
          backgroundColor: Colors.tabBarBackground,
          borderTopColor: Colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.red,
        tabBarInactiveTintColor: Colors.inactiveTab,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'EHA Connect',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="events" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leaderboards"
        options={{
          title: 'Leaders',
          headerTitle: 'Leaderboards',
          tabBarIcon: ({ focused }) => <TabIcon name="leaderboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          headerTitle: 'More',
          tabBarIcon: ({ focused }) => <TabIcon name="more" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const iconStyles = StyleSheet.create({
  house: { width: 20, height: 16, borderWidth: 2, borderTopWidth: 0, marginTop: 6 },
  houseRoof: { width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', position: 'absolute', top: -8, left: -2 },
  calendar: { width: 20, height: 18, borderWidth: 2, borderRadius: 3 },
  calendarTop: { height: 3, width: 16, position: 'absolute', top: 3 },
  barGroup: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 20 },
  bar: { width: 5, borderRadius: 2 },
  profileHead: { width: 10, height: 10, borderRadius: 5, alignSelf: 'center' },
  profileBody: { width: 18, height: 8, borderTopLeftRadius: 9, borderTopRightRadius: 9, marginTop: 2, alignSelf: 'center' },
  dotsRow: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 24, justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
