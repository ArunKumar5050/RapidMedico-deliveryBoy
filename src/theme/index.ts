export type ThemeMode = 'dark' | 'light';

// ─── Direct Design Tokens Specification ─────────────────────────────────────
export const colors = {
  brand: {
    primary: '#0077B6',        // Ocean Blue — main brand & primary actions
    primaryLight: '#90E0EF',   // Sky Blue — active toggle tracks, highlights
    primaryDark: '#005A8E',    // Deep Anchor Blue — dark headings & emphasis
    secondary: '#00B4D8',      // Vibrant Cyan — secondary accent & gradient start
    cyan: '#90E0EF',           // Soft sky
    cyanMid: '#00B4D8',        // Mid cyan
    cyanDeep: '#0077B6',       // Deep ocean
  },
  action: {
    accept: '#10B981',         // Semantic green strictly for "Accept Order" & success
    acceptPressed: '#059669',
    reject: '#DC2626',         // Red for "Reject Order" & destructive actions
    rejectPressed: '#B91C1C',
  },
  background: {
    primary: '#F0F7FF',        // Clean ice-blue canvas
    secondary: '#E3F2FD',      // Soft blue surface
    tertiary: '#DBEAFE',       // Deeper blue-light
    sageTop: '#F0F7FF',        // Tab bar & gradient top
    sageBottom: '#D6EAF8',     // Gradient bottom
  },
  text: {
    primary: '#0D1B2A',        // Near-black with deep blue tint
    secondary: '#3A5F7A',      // Muted blue-grey
    muted: '#7A9BB5',          // Light blue-grey
    inverse: '#FFFFFF',
  },
  border: {
    default: '#B3D4EA',        // Soft blue border
    focus: '#0077B6',          // Brand blue focus ring
    glass: 'rgba(255, 255, 255, 0.65)',
  },
  status: {
    warning: '#B45309',
    warningLight: '#FEF3C7',
    success: '#10B981',
    info: '#0077B6',
    neutral: '#7A9BB5',
  },
};

// ─── Typography Scale ────────────────────────────────────────────────────────
export const typography = {
  display: {
    fontSize: 48,
    fontWeight: '800' as const,
    lineHeight: 56,
  },
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyStrong: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
};

// ─── Spacing Scale ──────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 64,
};

// ─── Radii ──────────────────────────────────────────────────────────────────
export const radii = {
  sm: 8,
  md: 12,
  button: 14,
  card: 24,
  full: 9999,
};

// ─── Shadows ────────────────────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#0077B6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0077B6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#005A8E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ─── Component Defaults ─────────────────────────────────────────────────────
export const componentDefaults = {
  buttonPrimary: {
    minHeight: 56,
    borderRadius: 14,
  },
  card: {
    borderRadius: 24,
    padding: 24,
  },
  shadows,
};

export interface ThemeColors {
  bg: string;
  cardBg: string;
  cardBorder: string;
  subtleBox: string;
  containerLow: string;
  containerHigh: string;
  containerHighest: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryGlow: string;
  primaryBg: string;
  secondaryAccent: string;
  secondaryBg: string;
  tertiaryAccent: string;
  cyan: string;
  cyanMid: string;
  cyanDeep: string;
  success: string;
  successGlow: string;
  successBg: string;
  accept: string;
  acceptPressed: string;
  warning: string;
  warningGlow: string;
  warningBg: string;
  danger: string;
  dangerGlow: string;
  dangerBg: string;
  reject: string;
  rejectPressed: string;
  headerBg: string;
  tabBarBg: string;
  tabBarBorder: string;
}

// ─── Medical Blue & Cyan — Light Theme (Primary Default) ────────────────────
export const lightTheme: ThemeColors = {
  // Ice-blue canvas & surfaces
  bg: colors.background.primary,         // #F0F7FF
  cardBg: '#FFFFFF',
  cardBorder: colors.border.default,     // #B3D4EA
  subtleBox: colors.background.secondary,// #E3F2FD
  containerLow: colors.background.secondary,
  containerHigh: colors.background.tertiary, // #DBEAFE
  containerHighest: colors.border.default,

  // Typography
  textPrimary: colors.text.primary,      // #0D1B2A
  textSecondary: colors.text.secondary,  // #3A5F7A
  textMuted: colors.text.muted,          // #7A9BB5
  textInverse: colors.text.inverse,      // #FFFFFF

  // Brand
  primary: colors.brand.primary,         // #0077B6
  primaryLight: colors.brand.primaryLight,// #90E0EF
  primaryDark: colors.brand.primaryDark,  // #005A8E
  primaryGlow: colors.brand.primaryDark,
  primaryBg: 'rgba(0, 119, 182, 0.08)',

  secondaryAccent: colors.brand.secondary, // #00B4D8
  secondaryBg: 'rgba(0, 180, 216, 0.10)',
  tertiaryAccent: colors.brand.cyan,       // #90E0EF
  cyan: colors.brand.cyan,
  cyanMid: colors.brand.cyanMid,
  cyanDeep: colors.brand.cyanDeep,

  // Actions & Semantic
  success: colors.status.success,        // #10B981
  successGlow: colors.action.acceptPressed,// #059669
  successBg: 'rgba(16, 185, 129, 0.12)',
  accept: colors.action.accept,
  acceptPressed: colors.action.acceptPressed,

  warning: colors.status.warning,        // #B45309
  warningGlow: '#92400E',
  warningBg: colors.status.warningLight, // #FEF3C7

  danger: colors.action.reject,          // #DC2626
  dangerGlow: colors.action.rejectPressed,// #B91C1C
  dangerBg: 'rgba(220, 38, 38, 0.08)',
  reject: colors.action.reject,
  rejectPressed: colors.action.rejectPressed,

  headerBg: '#FFFFFF',
  tabBarBg: colors.background.sageTop,   // #F0F7FF
  tabBarBorder: colors.border.default,   // #B3D4EA
};

// ─── Medical Blue & Cyan — Dark Theme ────────────────────────────────────────
export const darkTheme: ThemeColors = {
  // Deep navy-blue backgrounds
  bg: '#0A1628',
  cardBg: '#0F1E35',
  cardBorder: '#1A3050',
  subtleBox: '#0D1B2E',
  containerLow: '#0D1B2E',
  containerHigh: '#162540',
  containerHighest: '#1A3050',

  // Text
  textPrimary: '#E8F4FD',
  textSecondary: '#90B4CC',
  textMuted: '#4E7A9B',
  textInverse: '#0D1B2A',

  // Brand
  primary: '#00B4D8',
  primaryLight: '#90E0EF',
  primaryDark: '#0077B6',
  primaryGlow: '#90E0EF',
  primaryBg: 'rgba(0, 180, 216, 0.15)',

  secondaryAccent: '#90E0EF',
  secondaryBg: 'rgba(144, 224, 239, 0.12)',
  tertiaryAccent: '#0077B6',
  cyan: '#90E0EF',
  cyanMid: '#00B4D8',
  cyanDeep: '#0077B6',

  // Actions & Semantic
  success: '#10B981',
  successGlow: '#34D399',
  successBg: 'rgba(16, 185, 129, 0.15)',
  accept: '#10B981',
  acceptPressed: '#059669',

  warning: '#F59E0B',
  warningGlow: '#D97706',
  warningBg: 'rgba(245, 158, 11, 0.15)',

  danger: '#EF4444',
  dangerGlow: '#F87171',
  dangerBg: 'rgba(239, 68, 68, 0.18)',
  reject: '#DC2626',
  rejectPressed: '#B91C1C',

  headerBg: '#0A1628',
  tabBarBg: '#0F1E35',
  tabBarBorder: '#1A3050',
};

