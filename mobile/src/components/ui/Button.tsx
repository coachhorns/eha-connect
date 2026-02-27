import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Spacing, FontSize, BorderRadius } from '@/constants/colors';
import { useColors } from '@/context/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const variantStyle: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: colors.red, borderRadius: BorderRadius.md }
      : variant === 'secondary'
        ? { backgroundColor: colors.navy, borderRadius: BorderRadius.md }
        : variant === 'outline'
          ? { backgroundColor: 'transparent', borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: colors.red }
          : { backgroundColor: 'transparent' };

  const textColor: string =
    variant === 'outline' || variant === 'ghost' ? colors.red : colors.textInverse;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyle,
        sizeStyles[size],
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.red : colors.textInverse}
          size="small"
        />
      ) : (
        <Text style={[styles.text, { color: textColor }, textSizes[size]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

const sizeStyles: Record<string, ViewStyle> = {
  sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, minHeight: 36 },
  md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, minHeight: 44 },
  lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, minHeight: 52 },
};

const textSizes: Record<string, TextStyle> = {
  sm: { fontSize: FontSize.sm },
  md: { fontSize: FontSize.md },
  lg: { fontSize: FontSize.lg },
};
