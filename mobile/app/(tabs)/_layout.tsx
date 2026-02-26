import { useEffect, useState, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, Dimensions, TouchableOpacity, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/context/AuthContext';
import { QuickMovePlayerSheet } from '@/components/QuickMovePlayerSheet';
import { QuickCreateTeamSheet } from '@/components/QuickCreateTeamSheet';
import { CustomizeActionsSheet, type ActionOption } from '@/components/CustomizeActionsSheet';
import * as Haptics from 'expo-haptics';
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
import { Colors, Fonts } from '@/constants/colors';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = Math.min(SCREEN_WIDTH * 0.7, 320);
const TAB_BAR_HEIGHT = 56;
const TAB_COUNT = 5;
const TAB_WIDTH = TAB_BAR_WIDTH / TAB_COUNT;
const PILL_PADDING = 6;

const SLIDE_SPRING = { damping: 18, stiffness: 170, mass: 0.8 };
const MORPH_SPRING = { damping: 14, stiffness: 140, mass: 0.7 };
const SNAP_SPRING = { damping: 16, stiffness: 200, mass: 0.7 };

// Morphing expansion constants
const EXPANDED_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 380);
const EXPANDED_HEIGHT = 175;
const EXPAND_SPRING = { damping: 16, stiffness: 180, mass: 0.85 };
const FADE_OUT_END = 0.35;
const FADE_IN_START = 0.35;
// The "more" tab (index 4) triggers expand instead of navigation
const MORE_TAB_INDEX = 4;

type QuickAction = { id: string; label: string; icon: string };

const SECURE_KEY = 'quickActionPrefs';

// Full pool of available actions per role
const DIRECTOR_POOL: (QuickAction & ActionOption)[] = [
  { id: 'move_player',   label: 'Move\nPlayer',   icon: 'move_player', description: 'Transfer a player between teams'  },
  { id: 'create_team',   label: 'Create\nTeam',   icon: 'team_plus',   description: 'Add a new team to your program'   },
  { id: 'register_team', label: 'Register\nTeam', icon: 'clipboard',   description: 'Register a team for an event'     },
  { id: 'next_game',     label: 'Next\nGame',     icon: 'calendar',    description: 'Jump to the next scheduled game'  },
  { id: 'share_profile', label: 'Share\nProfile', icon: 'share',       description: 'Share your player profile link'   },
  { id: 'game_log',      label: 'Game Log',       icon: 'list',        description: 'View your full game history'      },
];
const DIRECTOR_DEFAULTS = ['move_player', 'create_team', 'register_team', 'next_game'];

const PLAYER_POOL: (QuickAction & ActionOption)[] = [
  { id: 'share_profile', label: 'Share\nProfile', icon: 'share',    description: 'Share your player profile link'      },
  { id: 'game_log',      label: 'Game Log',       icon: 'list',     description: 'View your full game history'         },
  { id: 'next_game',     label: 'Next\nGame',     icon: 'calendar', description: 'Jump to the next scheduled game'     },
  { id: 'recruiting',    label: 'Recruiting',     icon: 'mail',     description: 'Send recruiting emails to coaches'   },
  { id: 'leaderboards',  label: 'Leaders',        icon: 'trophy',   description: 'View stats and leaderboards'        },
];
const PLAYER_DEFAULTS = ['share_profile', 'game_log', 'next_game'];

const PARENT_POOL: (QuickAction & ActionOption)[] = [
  { id: 'share_profile', label: 'Share\nProfile', icon: 'share',    description: 'Share player profile link'           },
  { id: 'game_log',      label: 'Game Log',       icon: 'list',     description: 'View full game history'              },
  { id: 'next_game',     label: 'Next\nGame',     icon: 'calendar', description: 'Jump to the next scheduled game'     },
  { id: 'switch_player', label: 'Switch\nPlayer', icon: 'people',   description: 'Switch between your players'         },
  { id: 'recruiting',    label: 'Recruiting',     icon: 'mail',     description: 'Send recruiting emails to coaches'   },
  { id: 'leaderboards',  label: 'Leaders',        icon: 'trophy',   description: 'View stats and leaderboards'        },
];
const PARENT_DEFAULTS = ['share_profile', 'game_log', 'next_game', 'switch_player'];

function getActionPool(role: string | undefined): (QuickAction & ActionOption)[] {
  if (role === 'PROGRAM_DIRECTOR' || role === 'ADMIN') return DIRECTOR_POOL;
  if (role === 'PARENT') return PARENT_POOL;
  return PLAYER_POOL;
}

function getDefaultIds(role: string | undefined): string[] {
  if (role === 'PROGRAM_DIRECTOR' || role === 'ADMIN') return DIRECTOR_DEFAULTS;
  if (role === 'PARENT') return PARENT_DEFAULTS;
  return PLAYER_DEFAULTS;
}

function QuickActionIcon({ name, color, size = 18 }: { name: string; color: string; size?: number }) {
  switch (name) {
    case 'mail':
      return (
        <View style={{ width: size, height: size * 0.7, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: size, height: size * 0.7, borderWidth: 1.6, borderColor: color, borderRadius: 2 }} />
          <View style={{
            position: 'absolute', top: 0, width: 0, height: 0,
            borderLeftWidth: size / 2, borderRightWidth: size / 2, borderTopWidth: size * 0.3,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color,
          }} />
        </View>
      );
    case 'calendar':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: size, height: size * 0.82, borderWidth: 1.6, borderColor: color, borderRadius: 2.5, position: 'absolute', bottom: 0 }}>
            <View style={{ height: 4, backgroundColor: color, borderTopLeftRadius: 1, borderTopRightRadius: 1 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 2, gap: 2, marginTop: 1 }}>
              <View style={{ width: 3, height: 2.5, backgroundColor: color, opacity: 0.6 }} />
              <View style={{ width: 3, height: 2.5, backgroundColor: color, opacity: 0.6 }} />
              <View style={{ width: 3, height: 2.5, backgroundColor: color, opacity: 0.6 }} />
            </View>
          </View>
          <View style={{ position: 'absolute', top: 0, left: size * 0.2, width: 1.8, height: 4, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ position: 'absolute', top: 0, right: size * 0.2, width: 1.8, height: 4, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );
    case 'trophy':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ width: size * 0.55, height: size * 0.6, borderWidth: 1.6, borderColor: color, borderTopLeftRadius: size * 0.25, borderTopRightRadius: size * 0.25, borderBottomWidth: 0, position: 'absolute', top: 0 }} />
          <View style={{ width: size * 0.3, height: 1.6, backgroundColor: color, position: 'absolute', bottom: size * 0.18 }} />
          <View style={{ width: size * 0.5, height: 1.6, backgroundColor: color, position: 'absolute', bottom: 0, borderRadius: 1 }} />
        </View>
      );
    case 'person':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, borderWidth: 1.6, borderColor: color }} />
          <View style={{ width: size * 0.7, height: size * 0.3, borderTopLeftRadius: size * 0.35, borderTopRightRadius: size * 0.35, borderWidth: 1.6, borderBottomWidth: 0, borderColor: color, marginTop: 2 }} />
        </View>
      );
    case 'share':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 1.6, height: size * 0.55, backgroundColor: color, position: 'absolute', bottom: size * 0.1 }} />
          <View style={{
            width: 0, height: 0, position: 'absolute', top: size * 0.05,
            borderLeftWidth: size * 0.2, borderRightWidth: size * 0.2, borderBottomWidth: size * 0.25,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
          }} />
          <View style={{ width: size * 0.65, height: size * 0.45, borderWidth: 1.6, borderTopWidth: 0, borderColor: color, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, position: 'absolute', bottom: 0 }} />
        </View>
      );
    case 'gear':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.5, height: size * 0.5, borderRadius: size * 0.25, borderWidth: 1.6, borderColor: color }} />
          <View style={{ width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1, backgroundColor: color, position: 'absolute' }} />
          <View style={{ width: 2, height: size, backgroundColor: color, position: 'absolute', borderRadius: 1 }} />
          <View style={{ width: size, height: 2, backgroundColor: color, position: 'absolute', borderRadius: 1 }} />
          <View style={{ width: 2, height: size, backgroundColor: color, position: 'absolute', borderRadius: 1, transform: [{ rotate: '45deg' }] }} />
          <View style={{ width: size, height: 2, backgroundColor: color, position: 'absolute', borderRadius: 1, transform: [{ rotate: '45deg' }] }} />
        </View>
      );
    case 'list':
      // Horizontal lines — game log / list view
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', gap: size * 0.18 }}>
          <View style={{ width: size, height: 1.8, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: size * 0.75, height: 1.8, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: size * 0.88, height: 1.8, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: size * 0.6, height: 1.8, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );
    case 'people':
      // Two overlapping person silhouettes — switch player
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {/* Back person (offset left) */}
          <View style={{ position: 'absolute', left: 0, top: 0, alignItems: 'center', opacity: 0.55 }}>
            <View style={{ width: size * 0.35, height: size * 0.35, borderRadius: size * 0.175, borderWidth: 1.4, borderColor: color }} />
            <View style={{ width: size * 0.6, height: size * 0.26, borderTopLeftRadius: size * 0.3, borderTopRightRadius: size * 0.3, borderWidth: 1.4, borderBottomWidth: 0, borderColor: color, marginTop: 1.5 }} />
          </View>
          {/* Front person (offset right) */}
          <View style={{ position: 'absolute', right: 0, top: 0, alignItems: 'center' }}>
            <View style={{ width: size * 0.35, height: size * 0.35, borderRadius: size * 0.175, borderWidth: 1.6, borderColor: color }} />
            <View style={{ width: size * 0.6, height: size * 0.26, borderTopLeftRadius: size * 0.3, borderTopRightRadius: size * 0.3, borderWidth: 1.6, borderBottomWidth: 0, borderColor: color, marginTop: 1.5 }} />
          </View>
        </View>
      );
    case 'move_player':
      // Person silhouette + right-arrow
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.38, height: size * 0.38, borderRadius: size * 0.19, borderWidth: 1.6, borderColor: color, position: 'absolute', top: 0, left: size * 0.04 }} />
          <View style={{ width: size * 0.62, height: size * 0.28, borderTopLeftRadius: size * 0.31, borderTopRightRadius: size * 0.31, borderWidth: 1.6, borderBottomWidth: 0, borderColor: color, position: 'absolute', bottom: size * 0.04, left: 0 }} />
          {/* Arrow */}
          <View style={{ position: 'absolute', right: 0, width: size * 0.38, height: 1.8, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ position: 'absolute', right: 0, top: size * 0.3,
            width: 0, height: 0,
            borderTopWidth: size * 0.13, borderBottomWidth: size * 0.13, borderLeftWidth: size * 0.18,
            borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color,
          }} />
        </View>
      );
    case 'team_plus':
      // Two small people + a plus
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.32, height: size * 0.32, borderRadius: size * 0.16, borderWidth: 1.5, borderColor: color, position: 'absolute', top: 0, left: size * 0.04 }} />
          <View style={{ width: size * 0.54, height: size * 0.24, borderTopLeftRadius: size * 0.27, borderTopRightRadius: size * 0.27, borderWidth: 1.5, borderBottomWidth: 0, borderColor: color, position: 'absolute', bottom: size * 0.22, left: 0 }} />
          {/* Plus */}
          <View style={{ position: 'absolute', right: 0, bottom: 0, width: size * 0.38, height: size * 0.38, borderRadius: size * 0.1, backgroundColor: Colors.navyLight, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: size * 0.22, height: 1.8, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ width: 1.8, height: size * 0.22, backgroundColor: color, borderRadius: 1, position: 'absolute' }} />
          </View>
        </View>
      );
    case 'clipboard':
      // Clipboard with plus — register team
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.78, height: size * 0.88, borderWidth: 1.6, borderColor: color, borderRadius: 2.5, position: 'absolute', bottom: 0 }}>
            {/* Clip at top */}
            <View style={{ width: size * 0.35, height: size * 0.16, backgroundColor: color, alignSelf: 'center', borderBottomLeftRadius: 2, borderBottomRightRadius: 2, marginTop: -1 }} />
            {/* Plus sign */}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: size * 0.32, height: 1.8, backgroundColor: color, borderRadius: 1 }} />
              <View style={{ width: 1.8, height: size * 0.32, backgroundColor: color, borderRadius: 1, position: 'absolute' }} />
            </View>
          </View>
        </View>
      );
    default:
      return <View style={{ width: size, height: size }} />;
  }
}

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

function ExpandedPanel({
  expandProgress,
  onClose,
  onAction,
  actions,
  isCustomizable,
  onCustomize,
}: {
  expandProgress: Animated.SharedValue<number>;
  onClose: () => void;
  onAction: (actionId: string) => void;
  actions: QuickAction[];
  isCustomizable: boolean;
  onCustomize: () => void;
}) {
  const dismissTranslateY = useSharedValue(0);
  const dismissTranslateX = useSharedValue(0);

  // Swipe down or sideways to dismiss
  const dismissGesture = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .activeOffsetX([-20, 20])
    .onUpdate((e) => {
      // Only allow downward or sideways drag (not upward)
      dismissTranslateY.value = Math.max(0, e.translationY);
      dismissTranslateX.value = e.translationX * 0.4;
    })
    .onEnd((e) => {
      const distance = Math.abs(e.translationY) + Math.abs(e.translationX);
      const velocity = Math.abs(e.velocityY) + Math.abs(e.velocityX);

      if (distance > 60 || velocity > 800) {
        // Dismiss — animate out then close
        dismissTranslateY.value = withTiming(300, { duration: 200 });
        runOnJS(onClose)();
      }
      // Snap back
      dismissTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      dismissTranslateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const panelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      expandProgress.value,
      [FADE_IN_START, 1],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      expandProgress.value,
      [FADE_IN_START, 1],
      [0.85, 1],
      Extrapolation.CLAMP
    );
    // Fade out as user drags to dismiss
    const dragOpacity = interpolate(
      dismissTranslateY.value,
      [0, 150],
      [1, 0.3],
      Extrapolation.CLAMP
    );
    return {
      opacity: opacity * dragOpacity,
      transform: [
        { scale },
        { translateY: dismissTranslateY.value },
        { translateX: dismissTranslateX.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={dismissGesture}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.expandedPanel, panelStyle]}>
        {/* Swipe handle */}
        <View style={styles.swipeHandle} />

        {/* Header */}
        <View style={styles.expandedHeader}>
          <Text style={styles.expandedTitle}>QUICK ACTIONS</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {isCustomizable && (
              <TouchableOpacity
                onPress={() => { onClose(); setTimeout(onCustomize, 350); }}
                style={styles.editButton}
                activeOpacity={0.7}
              >
                {/* Sliders / tune icon */}
                <View style={{ width: 14, height: 14, justifyContent: 'space-between', paddingVertical: 1 }}>
                  {/* Top bar with dot on left */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.textSecondary }} />
                    <View style={{ flex: 1, height: 1.5, backgroundColor: Colors.textSecondary, marginLeft: 1, borderRadius: 1 }} />
                  </View>
                  {/* Middle bar with dot on right */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1, height: 1.5, backgroundColor: Colors.textSecondary, marginRight: 1, borderRadius: 1 }} />
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.textSecondary }} />
                  </View>
                  {/* Bottom bar with dot on left */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.textSecondary }} />
                    <View style={{ flex: 1, height: 1.5, backgroundColor: Colors.textSecondary, marginLeft: 1, borderRadius: 1 }} />
                  </View>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <View style={{ width: 12, height: 12, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 14, height: 2, backgroundColor: Colors.textSecondary, borderRadius: 1, transform: [{ rotate: '45deg' }], position: 'absolute' }} />
                <View style={{ width: 14, height: 2, backgroundColor: Colors.textSecondary, borderRadius: 1, transform: [{ rotate: '-45deg' }], position: 'absolute' }} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Grid — width computed from action count */}
        <View style={styles.quickActionsGrid}>
          {actions.map((action) => {
            const gaps = (actions.length - 1) * 8;
            const itemWidth = (EXPANDED_WIDTH - 28 - 4 - gaps) / actions.length;
            return (
              <TouchableOpacity
                key={action.id}
                style={[styles.quickActionItem, { width: itemWidth }]}
                onPress={() => onAction(action.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
                  <QuickActionIcon name={action.icon} color="rgba(255, 255, 255, 0.75)" size={18} />
                </View>
                <Text style={styles.quickActionLabel} numberOfLines={2}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { user } = useAuth();
  const role = user?.role;
  const actionPool = useMemo(() => getActionPool(role), [role]);
  const defaultIds = useMemo(() => getDefaultIds(role), [role]);

  // Load saved action prefs from SecureStore
  const [savedIds, setSavedIds] = useState<string[] | null>(null);
  useEffect(() => {
    SecureStore.getItemAsync(SECURE_KEY).then(val => {
      if (val) {
        // Validate stored IDs against current pool
        const ids = JSON.parse(val) as string[];
        const poolIds = new Set(actionPool.map(a => a.id));
        const valid = ids.filter(id => poolIds.has(id));
        if (valid.length > 0) setSavedIds(valid);
      }
    });
  }, [actionPool]);

  const quickActions = useMemo<QuickAction[]>(() => {
    const ids = savedIds ?? defaultIds;
    return ids
      .map(id => actionPool.find(a => a.id === id))
      .filter(Boolean) as QuickAction[];
  }, [actionPool, savedIds, defaultIds]);

  const handleSavePrefs = async (ids: string[]) => {
    setSavedIds(ids);
    await SecureStore.setItemAsync(SECURE_KEY, JSON.stringify(ids));
  };

  // Sheet visibility
  const [showMovePlayer, setShowMovePlayer] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  const activeIndex = state.index;

  const pillCenterX = useSharedValue(activeIndex * TAB_WIDTH + TAB_WIDTH / 2);
  const isDragging = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const prevIndex = useSharedValue(activeIndex);

  // Morphing expansion state
  const expandProgress = useSharedValue(0);
  const isExpanded = useSharedValue(0);
  const [showBackdrop, setShowBackdrop] = useState(false);

  const pillCenter = useDerivedValue(() => pillCenterX.value);

  // Animate dot on programmatic tab change (from tap)
  useEffect(() => {
    const targetCenter = activeIndex * TAB_WIDTH + TAB_WIDTH / 2;
    const prev = prevIndex.value;

    if (prev !== activeIndex && isDragging.value === 0) {
      pillCenterX.value = withSpring(targetCenter, SLIDE_SPRING);
      prevIndex.value = activeIndex;
    }
  }, [activeIndex]);

  const navigateToTab = (index: number) => {
    const route     = state.routes[index];
    const isFocused = state.index === index;
    if (route) {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented && !isFocused) {
        // Check if the target tab's nested stack is deeper than the root screen.
        // If so, navigate to the root screen of that stack so the tab always
        // resets to home regardless of where you left it.
        const nestedState   = (state.routes[index] as any).state;
        const isDeepInStack = (nestedState?.index ?? 0) > 0;
        const rootName      = nestedState?.routes?.[0]?.name;

        if (isDeepInStack && rootName) {
          navigation.navigate(route.name, { screen: rootName });
        } else {
          navigation.navigate(route.name, route.params);
        }
      }
      // When already focused, the tabPress emit above is enough — each tab's
      // root screen listens for it and pops its own stack to top.
    }
  };

  const toggleExpand = () => {
    if (isExpanded.value === 0) {
      isExpanded.value = 1;
      setShowBackdrop(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      expandProgress.value = withSpring(1, EXPAND_SPRING);
    } else {
      isExpanded.value = 0;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      expandProgress.value = withSpring(0, EXPAND_SPRING);
      // Delay hiding backdrop until animation completes
      setTimeout(() => setShowBackdrop(false), 400);
    }
  };

  const handleAction = (actionId: string) => {
    // Close panel first
    isExpanded.value = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    expandProgress.value = withSpring(0, EXPAND_SPRING);
    setTimeout(() => setShowBackdrop(false), 400);

    // Navigate / open sheet based on action
    switch (actionId) {
      case 'share_profile':
        navigation.navigate('profile' as any);
        break;
      case 'game_log':
        (navigation as any).getParent()?.navigate('players/game-log');
        break;
      case 'next_game':
        navigation.navigate('events' as any);
        break;
      case 'switch_player':
        navigation.navigate('profile' as any);
        break;
      case 'register_team':
        navigation.navigate('events' as any);
        break;
      case 'move_player':
        setTimeout(() => setShowMovePlayer(true), 350);
        break;
      case 'create_team':
        setTimeout(() => setShowCreateTeam(true), 350);
        break;
      case 'recruiting':
        (navigation as any).getParent()?.navigate('recruiting');
        break;
      case 'leaderboards':
        navigation.navigate('leaderboards' as any);
        break;
    }
  };

  // Handle tap — more tab triggers expand, others navigate
  const handleTap = (tapIndex: number) => {
    if (tapIndex === MORE_TAB_INDEX) {
      toggleExpand();
    } else {
      navigateToTab(tapIndex);
    }
  };

  // Long-press on more tab → open customize sheet directly
  const handleLongPressMore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowCustomize(true);
  };

  // Tap gesture: tap an icon to switch tabs (skips more tab — handled by Pressable overlay)
  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      const tapIndex = Math.min(Math.max(Math.floor(e.x / TAB_WIDTH), 0), TAB_COUNT - 1);
      if (tapIndex < MORE_TAB_INDEX) {
        runOnJS(handleTap)(tapIndex);
      }
    });

  // Pan gesture: drag the pill across (clamped before the more tab)
  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onStart(() => {
      isDragging.value = 1;
      dragStartX.value = pillCenterX.value;
    })
    .onUpdate((e) => {
      const newCenter = dragStartX.value + e.translationX;
      const minCenter = TAB_WIDTH / 2;
      // Stop before the more tab slot
      const maxCenter = (MORE_TAB_INDEX - 1) * TAB_WIDTH + TAB_WIDTH / 2;
      if (newCenter < minCenter) {
        pillCenterX.value = minCenter + (newCenter - minCenter) * 0.2;
      } else if (newCenter > maxCenter) {
        pillCenterX.value = maxCenter + (newCenter - maxCenter) * 0.2;
      } else {
        pillCenterX.value = newCenter;
      }
    })
    .onEnd(() => {
      isDragging.value = 0;

      const clampedCenter = Math.min(
        Math.max(pillCenterX.value, TAB_WIDTH / 2),
        (MORE_TAB_INDEX - 1) * TAB_WIDTH + TAB_WIDTH / 2
      );
      const nearestIndex = Math.min(
        Math.round((clampedCenter - TAB_WIDTH / 2) / TAB_WIDTH),
        MORE_TAB_INDEX - 1
      );
      const snapCenter = nearestIndex * TAB_WIDTH + TAB_WIDTH / 2;

      pillCenterX.value = withSpring(snapCenter, SNAP_SPRING);

      runOnJS(navigateToTab)(nearestIndex);
      prevIndex.value = nearestIndex;
    });

  // Race: pan (>8px drag) or tap (quick lift). More tab handled by Pressable overlay.
  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Morphing container: animates size, border radius, and rises upward
  const morphContainerStyle = useAnimatedStyle(() => {
    const width = interpolate(expandProgress.value, [0, 1], [TAB_BAR_WIDTH, EXPANDED_WIDTH]);
    const height = interpolate(expandProgress.value, [0, 1], [TAB_BAR_HEIGHT, EXPANDED_HEIGHT]);
    const borderRadius = interpolate(expandProgress.value, [0, 1], [TAB_BAR_HEIGHT / 2, 20]);
    // Scale squish during mid-transition for morph feel
    const scaleX = interpolate(expandProgress.value, [0, 0.4, 1], [1, 0.96, 1]);
    const scaleY = interpolate(expandProgress.value, [0, 0.4, 1], [1, 1.04, 1]);
    // Push the shell up so expanded panel sits directly above the tab bar
    const marginBottom = interpolate(expandProgress.value, [0, 1], [0, TAB_BAR_HEIGHT + 8]);

    return {
      width,
      height,
      borderRadius,
      marginBottom,
      transform: [{ scaleX }, { scaleY }],
    };
  });

  // Collapsed row fades out 0 -> 0.35
  const collapsedRowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      expandProgress.value,
      [0, FADE_OUT_END],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  return (
    <>
      <GestureHandlerRootView style={[styles.tabBarContainer, showBackdrop && styles.tabBarContainerExpanded]}>
        {/* Full-screen tap-to-close backdrop */}
        {showBackdrop && (
          <Pressable style={styles.backdrop} onPress={toggleExpand} />
        )}

        {/* Morphing shell */}
        <Animated.View style={[styles.morphShell, morphContainerStyle]}>
          {/* Glass blur background */}
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.glassInner} />
          </BlurView>

          {/* Collapsed content: tab bar */}
          <Animated.View style={[styles.collapsedRow, collapsedRowStyle]} pointerEvents={isExpanded.value ? 'none' : 'auto'}>
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={styles.tabSection}>
                {/* Tab icons */}
                {state.routes.map((route, index) => (
                  <AnimatedTab
                    key={route.key}
                    index={index}
                    name={route.name}
                    pillCenter={pillCenter}
                  />
                ))}
              </Animated.View>
            </GestureDetector>
            {/* More tab overlay: tap to expand, long-press to customize */}
            <Pressable
              onPress={toggleExpand}
              onLongPress={handleLongPressMore}
              delayLongPress={500}
              style={styles.moreTabOverlay}
            />
          </Animated.View>

          {/* Expanded panel */}
          <ExpandedPanel
            expandProgress={expandProgress}
            onClose={toggleExpand}
            onAction={handleAction}
            actions={quickActions}
            isCustomizable={true}
            onCustomize={() => setShowCustomize(true)}
          />
        </Animated.View>
      </GestureHandlerRootView>

      {/* Sheets — rendered outside the gesture root */}
      <QuickMovePlayerSheet
        visible={showMovePlayer}
        onClose={() => setShowMovePlayer(false)}
      />
      <QuickCreateTeamSheet
        visible={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
      />
      <CustomizeActionsSheet
        visible={showCustomize}
        currentIds={savedIds ?? defaultIds}
        availableActions={actionPool}
        onSave={handleSavePrefs}
        onClose={() => setShowCustomize(false)}
      />
    </>
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
          title: 'Stats Hub',
          headerShown: false,
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
    // flex direction column-reverse so children anchor from bottom
    flexDirection: 'column-reverse',
  },
  tabBarContainerExpanded: {
    top: 0,
  },
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -50,
    right: -50,
    bottom: -100,
  },
  morphShell: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  glassInner: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  collapsedRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT,
    width: TAB_BAR_WIDTH,
  },
  tabSection: {
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
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
  expandedPanel: {
    paddingTop: 8,
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  swipeHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 6,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  expandedTitle: {
    fontSize: 11,
    fontFamily: Fonts.headingBlack,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    gap: 8,
  },
  quickActionItem: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 13,
  },
  moreTabOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: TAB_WIDTH,
    height: TAB_BAR_HEIGHT,
  },
});
