import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'navy';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const colors = useColors();

  const variantStyle: ViewStyle =
    variant === 'elevated'
      ? { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }
      : variant === 'navy'
        ? { backgroundColor: Colors.navy, borderColor: Colors.navyLight }
        : { backgroundColor: colors.surface, borderColor: colors.border };

  return (
    <View style={[styles.card, variantStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
});
