import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'navy';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return (
    <View style={[styles.card, variants[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

const variants: Record<string, ViewStyle> = {
  default: {
    backgroundColor: Colors.surface,
  },
  elevated: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.borderLight,
  },
  navy: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navyLight,
  },
};
