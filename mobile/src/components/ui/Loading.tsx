import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { FontSize, Spacing } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message, fullScreen = true }: LoadingProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, fullScreen && { flex: 1, backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.red} />
      {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  message: {
    fontSize: FontSize.md,
    marginTop: Spacing.lg,
  },
});
