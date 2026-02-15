import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/colors';

interface StatBoxProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export function StatBox({ label, value, highlight = false }: StatBoxProps) {
  return (
    <View style={[styles.container, highlight && styles.highlight]}>
      <Text style={[styles.value, highlight && styles.valueHighlight]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  highlight: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navyLight,
  },
  value: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  valueHighlight: {
    color: Colors.gold,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
});
