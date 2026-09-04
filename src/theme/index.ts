export type ThemeMode = 'dark' | 'light';

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
  primary: string;
  primaryGlow: string;
  primaryBg: string;
  secondaryAccent: string;
  secondaryBg: string;
  tertiaryAccent: string;
  success: string;
  successGlow: string;
  successBg: string;
  warning: string;
  warningGlow: string;
  warningBg: string;
  danger: string;
  dangerGlow: string;
  dangerBg: string;
  headerBg: string;
  tabBarBg: string;
  tabBarBorder: string;
}

export const darkTheme: ThemeColors = {
  bg: '#0e1320',
  cardBg: '#1a1f2d',
  cardBorder: '#303443',
  subtleBox: '#161b29',
  containerLow: '#161b29',
  containerHigh: '#252a38',
  containerHighest: '#303443',
  textPrimary: '#dee2f5',
  textSecondary: '#c2c6d6',
  textMuted: '#8c909f',
  primary: '#adc6ff',
  primaryGlow: '#4d8eff',
  primaryBg: 'rgba(77, 142, 255, 0.15)',
  secondaryAccent: '#4fdbc8',
  secondaryBg: 'rgba(79, 219, 200, 0.15)',
  tertiaryAccent: '#4ae176',
  success: '#4ae176',
  successGlow: '#6bff8f',
  successBg: 'rgba(74, 225, 118, 0.15)',
  warning: '#f59e0b',
  warningGlow: '#fbbf24',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#ffb4ab',
  dangerGlow: '#ffdad6',
  dangerBg: 'rgba(147, 0, 10, 0.4)',
  headerBg: '#0e1320',
  tabBarBg: '#161b29',
  tabBarBorder: '#252a38',
};

export const lightTheme: ThemeColors = {
  bg: '#f1f5f9',
  cardBg: '#ffffff',
  cardBorder: '#cbd5e1',
  subtleBox: '#f8fafc',
  containerLow: '#f8fafc',
  containerHigh: '#e2e8f0',
  containerHighest: '#cbd5e1',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#0284c7',
  primaryGlow: '#0369a1',
  primaryBg: 'rgba(2, 132, 199, 0.1)',
  secondaryAccent: '#0d9488',
  secondaryBg: 'rgba(13, 148, 136, 0.1)',
  tertiaryAccent: '#16a34a',
  success: '#059669',
  successGlow: '#047857',
  successBg: 'rgba(5, 150, 105, 0.1)',
  warning: '#d97706',
  warningGlow: '#b45309',
  warningBg: 'rgba(217, 119, 6, 0.1)',
  danger: '#dc2626',
  dangerGlow: '#b91c1c',
  dangerBg: 'rgba(220, 38, 38, 0.1)',
  headerBg: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',
};
