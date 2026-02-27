/**
 * DynamicSheet — React Native equivalent of the Swift DynamicSheet component.
 *
 * Fixes over a plain Modal:
 *  1. No backdrop/sheet overlap — dismiss area only covers the space ABOVE the sheet
 *  2. Keyboard avoidance — listens to keyboard events and animates the sheet up
 *  3. Swipe-to-dismiss — PanResponder on the handle area, snap-back if threshold not met
 *  4. Animated close — sheet stays mounted until the close animation finishes
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  Keyboard,
  PanResponder,
} from 'react-native';
import { Spacing } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Max sheet height — mirrors the Swift "windowSize.height - 110" cap */
export const SHEET_MAX_HEIGHT = SCREEN_HEIGHT - 110;

/**
 * Recommended maxHeight for a sheet's scrollable body area.
 * Leaves room for: handle (~24px) + header (~75px) + footer (~90px) + buffer (~30px)
 */
export const SHEET_BODY_MAX = Math.round(SHEET_MAX_HEIGHT - 220);

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function DynamicSheet({ visible, onClose, children }: Props) {
  const colors = useColors();

  // Keep modal mounted through the close animation
  const [modalVisible, setModalVisible] = useState(false);

  // Animated values — all JS-thread (useNativeDriver: false) so they can be
  // combined and respond to both keyboard events and pan gestures
  const slideValue = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // Always keep the latest onClose reference so the stale-closure PanResponder
  // can call it correctly
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // ── Composite transform: slide-in + swipe drag − keyboard lift ──────────
  // Created once via useRef so Animated never loses the node reference
  const translateY = useRef(
    Animated.add(slideValue, Animated.subtract(panY, keyboardOffset))
  ).current;

  // ── Dismiss helper (used in multiple places) ───────────────────────────
  const dismiss = useCallback((callback?: () => void) => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideValue, {
        toValue: SCREEN_HEIGHT,
        duration: 260,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      panY.setValue(0);
      keyboardOffset.setValue(0);
      setModalVisible(false);
      callback?.();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open / close driven by visible prop ───────────────────────────────
  useEffect(() => {
    if (visible) {
      // Reset to off-screen, then spring in
      panY.setValue(0);
      slideValue.setValue(SCREEN_HEIGHT);
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(slideValue, {
          toValue: 0,
          useNativeDriver: false,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (modalVisible) {
      dismiss();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard avoidance ────────────────────────────────────────────────
  // Animate the sheet up when keyboard appears so the footer buttons and
  // active input remain visible above the keyboard
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? (e.duration ?? 250) : 250,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e.duration ?? 250) : 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Swipe-to-dismiss via handle drag area ─────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // Only this area claims the gesture — doesn't fight with inner ScrollViews
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5,

      onPanResponderMove: (_, gs) => {
        // Only allow dragging downward (positive dy)
        if (gs.dy > 0) panY.setValue(gs.dy);
      },

      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.8) {
          // Threshold met — animate out then notify parent
          Animated.parallel([
            Animated.timing(slideValue, {
              toValue: SCREEN_HEIGHT,
              duration: 250,
              useNativeDriver: false,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start(() => {
            panY.setValue(0);
            keyboardOffset.setValue(0);
            setModalVisible(false);
            onCloseRef.current();
          });
        } else {
          // Below threshold — snap back
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
            damping: 20,
            stiffness: 300,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss(onCloseRef.current)}
    >
      {/* Backdrop: full-screen tint, never intercepts touches */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity, backgroundColor: colors.modalBackdrop }]}
        pointerEvents="none"
      />

      {/* Flex container — pointerEvents box-none so the View itself doesn't consume taps */}
      <View style={styles.container} pointerEvents="box-none">
        {/* Dismiss area fills all space ABOVE the sheet — no overlap */}
        <TouchableOpacity
          style={styles.dismissArea}
          onPress={() => dismiss(onCloseRef.current)}
          activeOpacity={1}
        />

        {/* The sheet itself */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ translateY }],
            },
          ]}
        >
          {/*
           * Handle + drag area — tall enough for a comfortable swipe target.
           * PanResponder lives here so it doesn't compete with inner ScrollViews.
           */}
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SHEET_MAX_HEIGHT,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  // Generous drag target height so users can easily grab it
  handleArea: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});
