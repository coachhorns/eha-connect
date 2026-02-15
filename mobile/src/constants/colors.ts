export const Colors = {
  // EHA Brand
  navy: '#0D2B5B',
  navySurface: '#153361',
  navyLight: '#1E4A8A',
  red: '#C8102E',
  redLight: '#E41937',
  gold: '#C5A900',
  goldLight: '#FFD700',
  silver: '#A2AAAD',

  // Backgrounds
  background: '#0A0A1A',
  surface: '#111127',
  surfaceLight: '#1A1A35',
  surfaceElevated: '#222244',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6B6B80',
  textInverse: '#0A0A1A',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // UI
  border: '#2A2A45',
  borderLight: '#3A3A55',
  inputBackground: '#1A1A35',
  tabBarBackground: '#0A0A1A',
  tabBarBorder: '#1A1A35',
  activeTab: '#C8102E',
  inactiveTab: '#6B6B80',

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
