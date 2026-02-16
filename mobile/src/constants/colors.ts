export const Colors = {
  // EHA Brand
  navy: '#0F172A',
  navySurface: '#1E293B',
  navyLight: '#334155',
  red: '#EF4444',
  redLight: '#F87171',
  gold: '#F59E0B',
  goldLight: '#FBBF24',
  silver: '#9CA3AF',

  // Backgrounds
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  surfaceElevated: '#475569',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // UI
  border: '#334155',
  borderLight: '#475569',
  inputBackground: '#1E293B',
  tabBarBackground: '#0F172A',
  tabBarBorder: '#1E293B',
  activeTab: '#EF4444',
  inactiveTab: '#64748B',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  shimmer: 'rgba(255, 255, 255, 0.05)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const Fonts = {
  // Headings (Outfit)
  heading: 'Outfit_700Bold',
  headingSemiBold: 'Outfit_600SemiBold',
  headingBlack: 'Outfit_800ExtraBold',
  // Body (Inter)
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;
