import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';

interface StatBoxProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export function StatBox({ label, value, highlight = false }: StatBoxProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
        highlight && { backgroundColor: Colors.navy, borderColor: Colors.navyLight },
      ]}
    >
      <Text style={[styles.value, { color: colors.textPrimary }, highlight && { color: Colors.gold }]}>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
  },
  value: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
});
