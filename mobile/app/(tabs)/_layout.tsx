import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = Math.min(SCREEN_WIDTH * 0.7, 320);
const TAB_BAR_HEIGHT = 56;
const TAB_COUNT = 5;
const TAB_WIDTH = TAB_BAR_WIDTH / TAB_COUNT;
const PILL_HEIGHT = 40;
const PILL_PADDING = 6;
const REST_WIDTH = TAB_WIDTH - PILL_PADDING * 2;

const SLIDE_SPRING = { damping: 18, stiffness: 170, mass: 0.8 };
const MORPH_SPRING = { damping: 14, stiffness: 140, mass: 0.7 };
const SNAP_SPRING = { damping: 16, stiffness: 200, mass: 0.7 };

function TabIcon({ name, color }: { name: string; color: string }) {
  switch (name) {
    case 'index':
      return (
        <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 15, height: 11, borderWidth: 1.8, borderTopWidth: 0, borderColor: color, position: 'absolute', bottom: 0 }} />
          <View style={{ width: 0, height: 0, borderLeftWidth: 11, borderRightWidth: 11, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color, position: 'absolute', top: 0 }} />
          <View style={{ width: 4.5, height: 5.5, backgroundColor: color, position: 'absolute', bottom: 0 }} />
        </View>
      );
    case 'events':
      return (
        <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 17, height: 15, borderWidth: 1.8, borderColor: color, borderRadius: 2.5, position: 'absolute', bottom: 0 }}>
            <View style={{ height: 4.5, backgroundColor: color, borderTopLeftRadius: 1, borderTopRightRadius: 1 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 2, gap: 2, marginTop: 1 }}>
              <View style={{ width: 3, height: 2.5, backgroundColor: color, opacity: 0.6 }} />
              <View style={{ width: 3, height: 2.5, backgroundColor: color, opacity: 0.6 }} />
              <View style={{ width: 3, height: 2.5, backgroundColor: color, opacity: 0.6 }} />
            </View>
          </View>
          <View style={{ position: 'absolute', top: 0, left: 3, width: 2, height: 4.5, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ position: 'absolute', top: 0, right: 3, width: 2, height: 4.5, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );
    case 'leaderboards':
      return (
        <View style={{ width: 22, height: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2.5 }}>
          <View style={{ width: 5, height: 10, backgroundColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
          <View style={{ width: 5, height: 18, backgroundColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
          <View style={{ width: 5, height: 13, backgroundColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
        </View>
      );
    case 'profile':
      return (
        <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.8, borderColor: color }} />
          <View style={{ width: 17, height: 8, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderWidth: 1.8, borderBottomWidth: 0, borderColor: color, marginTop: 2 }} />
        </View>
      );
    case 'more':
      return (
        <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 18, height: 18, borderWidth: 1.8, borderColor: color, borderRadius: 9, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: 8, height: 1.8, backgroundColor: color }} />
            <View style={{ width: 1.8, height: 8, backgroundColor: color, position: 'absolute' }} />
          </View>
        </View>
      );
    default:
      return <View style={{ width: 22, height: 22 }} />;
  }
}

function AnimatedTab({ index, name, pillCenter }: {
  index: number;
  name: string;
  pillCenter: Animated.SharedValue<number>;
}) {
  const tabCenter = index * TAB_WIDTH + TAB_WIDTH / 2;

  const proximity = useDerivedValue(() => {
    const dist = Math.abs(pillCenter.value - tabCenter);
    return Math.max(0, 1 - dist / (TAB_WIDTH * 0.8));
  });

  const iconContainerStyle = useAnimatedStyle(() => {
    const p = proximity.value;
    const scale = interpolate(p, [0, 0.5, 1], [1, 1.05, 1.15]);
    return { transform: [{ scale }] };
  });

  const iconOpacityStyle = useAnimatedStyle(() => {
    const p = proximity.value;
    return { opacity: interpolate(p, [0, 0.3, 1], [0.35, 0.6, 1]) };
  });

  return (
    <View style={styles.tabItem}>
      <Animated.View style={[styles.iconWrapper, iconContainerStyle]}>
        <Animated.View style={iconOpacityStyle}>
          <TabIcon name={name} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const activeIndex = state.index;

  const pillCenterX = useSharedValue(activeIndex * TAB_WIDTH + TAB_WIDTH / 2);
  const pillW = useSharedValue(REST_WIDTH);
  const isDragging = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const prevIndex = useSharedValue(activeIndex);

  const pillCenter = useDerivedValue(() => pillCenterX.value);

  // Animate pill on programmatic tab change (from tap)
  useEffect(() => {
    const targetCenter = activeIndex * TAB_WIDTH + TAB_WIDTH / 2;
    const prev = prevIndex.value;

    if (prev !== activeIndex && isDragging.value === 0) {
      const prevCenter = prev * TAB_WIDTH + TAB_WIDTH / 2;
      const distance = Math.abs(targetCenter - prevCenter);
      const stretchWidth = distance + REST_WIDTH;
      const midpoint = (prevCenter + targetCenter) / 2;

      // Phase 1: stretch to span both positions
      pillCenterX.value = withTiming(midpoint, {
        duration: 180,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      pillW.value = withTiming(stretchWidth, {
        duration: 180,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      // Phase 2: contract to destination
      setTimeout(() => {
        pillCenterX.value = withSpring(targetCenter, SLIDE_SPRING);
        pillW.value = withSpring(REST_WIDTH, MORPH_SPRING);
      }, 170);

      prevIndex.value = activeIndex;
    }
  }, [activeIndex]);

  const navigateToTab = (index: number) => {
    const route = state.routes[index];
    if (route) {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    }
  };

  // Tap gesture: tap an icon to switch tabs
  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      const tapIndex = Math.min(Math.max(Math.floor(e.x / TAB_WIDTH), 0), TAB_COUNT - 1);
      runOnJS(navigateToTab)(tapIndex);
    });

  // Pan gesture: drag the pill across
  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onStart(() => {
      isDragging.value = 1;
      dragStartX.value = pillCenterX.value;
    })
    .onUpdate((e) => {
      const absVel = Math.abs(e.velocityX);

      const newCenter = dragStartX.value + e.translationX;
      const minCenter = TAB_WIDTH / 2;
      const maxCenter = TAB_BAR_WIDTH - TAB_WIDTH / 2;
      if (newCenter < minCenter) {
        pillCenterX.value = minCenter + (newCenter - minCenter) * 0.2;
      } else if (newCenter > maxCenter) {
        pillCenterX.value = maxCenter + (newCenter - maxCenter) * 0.2;
      } else {
        pillCenterX.value = newCenter;
      }

      // Velocity-based stretching
      const stretchWidth = interpolate(
        absVel,
        [0, 200, 600, 1200, 2000],
        [REST_WIDTH, REST_WIDTH * 1.2, REST_WIDTH * 1.6, REST_WIDTH * 2.2, REST_WIDTH * 3.0],
        Extrapolation.CLAMP
      );
      pillW.value = stretchWidth;
    })
    .onEnd(() => {
      isDragging.value = 0;

      const clampedCenter = Math.min(
        Math.max(pillCenterX.value, TAB_WIDTH / 2),
        TAB_BAR_WIDTH - TAB_WIDTH / 2
      );
      const nearestIndex = Math.round((clampedCenter - TAB_WIDTH / 2) / TAB_WIDTH);
      const snapCenter = nearestIndex * TAB_WIDTH + TAB_WIDTH / 2;

      pillCenterX.value = withSpring(snapCenter, SNAP_SPRING);
      pillW.value = withSpring(REST_WIDTH, MORPH_SPRING);

      runOnJS(navigateToTab)(nearestIndex);
      prevIndex.value = nearestIndex;
    });

  // Race: if user starts dragging (>8px), use pan. Otherwise treat as tap.
  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Pill animated style
  const pillStyle = useAnimatedStyle(() => {
    const left = pillCenterX.value - pillW.value / 2;
    const widthRatio = pillW.value / REST_WIDTH;
    const scaleY = interpolate(
      widthRatio,
      [1, 1.5, 2.5, 3],
      [1, 0.92, 0.82, 0.75],
      Extrapolation.CLAMP
    );

    return {
      left,
      width: pillW.value,
      transform: [{ scaleY }],
    };
  });

  return (
    <GestureHandlerRootView style={styles.tabBarContainer}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View>
          <BlurView intensity={80} tint="dark" style={styles.tabBarBlur}>
            <View style={styles.tabBarInner}>
              {/* Clean red pill indicator */}
              <Animated.View style={[styles.pill, pillStyle]} />

              {/* Tab icons */}
              {state.routes.map((route, index) => (
                <AnimatedTab
                  key={route.key}
                  index={index}
                  name={route.name}
                  pillCenter={pillCenter}
                />
              ))}
            </View>
          </BlurView>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
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
          headerShown: false,
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
    bottom: Platform.OS === 'ios' ? 32 : 18,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBarBlur: {
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  tabBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  pill: {
    position: 'absolute',
    height: PILL_HEIGHT,
    top: (TAB_BAR_HEIGHT - PILL_HEIGHT) / 2,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: Colors.red,
    zIndex: 0,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  tabItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
