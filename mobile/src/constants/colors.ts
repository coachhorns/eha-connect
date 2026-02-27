// ─── Dark Palette (default) ──────────────────────────────────────────────────

export const DarkColors = {
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

  // Semantic overlays
  headerOverlay: 'rgba(15, 23, 42, 0.5)',
  headerBorder: 'rgba(255, 255, 255, 0.08)',
  glassTint: 'dark' as const,
  inputOverlay: 'rgba(255, 255, 255, 0.08)',
  inputBorder: 'rgba(255, 255, 255, 0.18)',
  buttonOverlay: 'rgba(255, 255, 255, 0.15)',
  buttonBorder: 'rgba(255, 255, 255, 0.3)',
  cardOverlay: 'rgba(255, 255, 255, 0.06)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  heroGradientStart: 'rgba(15, 23, 42, 0.0)',
  heroGradientMid: 'rgba(15, 23, 42, 0.6)',
  heroGradientEnd: 'rgba(15, 23, 42, 0.92)',
  modalBackdrop: 'rgba(0, 0, 0, 0.55)',
  redTint: 'rgba(239, 68, 68, 0.1)',
  goldTint: 'rgba(245, 158, 11, 0.06)',
  successTint: 'rgba(34, 197, 94, 0.08)',
  successBorder: 'rgba(34, 197, 94, 0.25)',
  warningTint: 'rgba(251, 191, 36, 0.06)',
  warningBorder: 'rgba(251, 191, 36, 0.2)',
  alternateRow: '#182234',
  activeRowHighlight: 'rgba(245, 158, 11, 0.06)',
} as const;

// ─── Type ────────────────────────────────────────────────────────────────────

export type ColorPalette = {
  [K in keyof typeof DarkColors]: (typeof DarkColors)[K] extends 'dark' | 'light'
    ? 'dark' | 'light'
    : string;
};

// ─── Light Palette ───────────────────────────────────────────────────────────

export const LightColors: ColorPalette = {
  // EHA Brand (unchanged)
  navy: '#0F172A',
  navySurface: '#1E293B',
  navyLight: '#334155',
  red: '#EF4444',
  redLight: '#F87171',
  gold: '#F59E0B',
  goldLight: '#FBBF24',
  silver: '#9CA3AF',

  // Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceLight: '#F1F5F9',
  surfaceElevated: '#E2E8F0',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Status (unchanged)
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // UI
  border: '#E2E8F0',
  borderLight: '#CBD5E1',
  inputBackground: '#F1F5F9',
  tabBarBackground: '#0F172A',
  tabBarBorder: '#1E293B',
  activeTab: '#EF4444',
  inactiveTab: '#64748B',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.3)',
  shimmer: 'rgba(0, 0, 0, 0.03)',

  // Semantic overlays
  headerOverlay: 'rgba(248, 250, 252, 0.85)',
  headerBorder: 'rgba(0, 0, 0, 0.06)',
  glassTint: 'light' as const,
  inputOverlay: 'rgba(0, 0, 0, 0.04)',
  inputBorder: 'rgba(0, 0, 0, 0.1)',
  buttonOverlay: 'rgba(0, 0, 0, 0.06)',
  buttonBorder: 'rgba(0, 0, 0, 0.12)',
  cardOverlay: 'rgba(0, 0, 0, 0.03)',
  cardBorder: 'rgba(0, 0, 0, 0.06)',
  heroGradientStart: 'rgba(248, 250, 252, 0.0)',
  heroGradientMid: 'rgba(248, 250, 252, 0.6)',
  heroGradientEnd: 'rgba(248, 250, 252, 0.92)',
  modalBackdrop: 'rgba(0, 0, 0, 0.3)',
  redTint: 'rgba(239, 68, 68, 0.08)',
  goldTint: 'rgba(245, 158, 11, 0.06)',
  successTint: 'rgba(34, 197, 94, 0.08)',
  successBorder: 'rgba(34, 197, 94, 0.2)',
  warningTint: 'rgba(251, 191, 36, 0.06)',
  warningBorder: 'rgba(251, 191, 36, 0.2)',
  alternateRow: '#F1F5F9',
  activeRowHighlight: '#FFFBEB',
};

// ─── Backward-compatible export ──────────────────────────────────────────────

/** Static dark palette — used by tab bar and auth screens that stay dark always */
export const Colors = DarkColors;

// ─── Non-theme tokens (shared across both themes) ───────────────────────────

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
