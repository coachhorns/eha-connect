import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Pressable, Dimensions } from 'react-native';
import { Colors } from '@/constants/colors';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = Math.min(SCREEN_WIDTH * 0.62, 280);
const TAB_BAR_HEIGHT = 52;

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const iconColor = focused ? '#FFFFFF' : 'rgba(255,255,255,0.45)';

  const icon = (() => {
    switch (name) {
      case 'index':
        return (
          <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: 14, height: 10, borderWidth: 1.6, borderTopWidth: 0, borderColor: iconColor, position: 'absolute', bottom: 0 }} />
            <View style={{ width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: iconColor, position: 'absolute', top: 0 }} />
            <View style={{ width: 4, height: 5, backgroundColor: iconColor, position: 'absolute', bottom: 0 }} />
          </View>
        );
      case 'events':
        return (
          <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: 16, height: 14, borderWidth: 1.6, borderColor: iconColor, borderRadius: 2.5, position: 'absolute', bottom: 0 }}>
              <View style={{ height: 4, backgroundColor: iconColor, borderTopLeftRadius: 1, borderTopRightRadius: 1 }} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 1.5, gap: 1.5, marginTop: 1 }}>
                <View style={{ width: 2.5, height: 2, backgroundColor: iconColor, opacity: 0.6 }} />
                <View style={{ width: 2.5, height: 2, backgroundColor: iconColor, opacity: 0.6 }} />
                <View style={{ width: 2.5, height: 2, backgroundColor: iconColor, opacity: 0.6 }} />
              </View>
            </View>
            <View style={{ position: 'absolute', top: 0, left: 3, width: 1.8, height: 4, backgroundColor: iconColor, borderRadius: 1 }} />
            <View style={{ position: 'absolute', top: 0, right: 3, width: 1.8, height: 4, backgroundColor: iconColor, borderRadius: 1 }} />
          </View>
        );
      case 'leaderboards':
        return (
          <View style={{ width: 20, height: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
            <View style={{ width: 4.5, height: 9, backgroundColor: iconColor, borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5 }} />
            <View style={{ width: 4.5, height: 16, backgroundColor: iconColor, borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5 }} />
            <View style={{ width: 4.5, height: 12, backgroundColor: iconColor, borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5 }} />
          </View>
        );
      case 'profile':
        return (
          <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.6, borderColor: iconColor }} />
            <View style={{ width: 16, height: 7, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1.6, borderBottomWidth: 0, borderColor: iconColor, marginTop: 1.5 }} />
          </View>
        );
      case 'more':
        return (
          <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: 16, height: 16, borderWidth: 1.6, borderColor: iconColor, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: 7, height: 1.6, backgroundColor: iconColor }} />
              <View style={{ width: 1.6, height: 7, backgroundColor: iconColor, position: 'absolute' }} />
            </View>
          </View>
        );
      default:
        return <View style={{ width: 20, height: 20 }} />;
    }
  })();

  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      {icon}
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarPill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
            >
              <TabIcon name={route.name} focused={isFocused} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'EHA Connect',
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="leaderboards"
        options={{
          title: 'Leaders',
          headerTitle: 'Leaderboards',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          headerTitle: 'More',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBarPill: {
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    backgroundColor: 'rgba(13, 43, 91, 0.95)',
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    borderColor: 'rgba(30, 74, 138, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperActive: {
    backgroundColor: Colors.red,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
});
