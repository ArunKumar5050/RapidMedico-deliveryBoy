import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ThemeColors, darkTheme, lightTheme } from '../theme';

const STORAGE_KEY = '@rapidmedico_theme_mode';

interface ThemeState {
  themeMode: ThemeMode;
  theme: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  loadSavedTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: 'dark',
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {
    const nextMode: ThemeMode = get().themeMode === 'dark' ? 'light' : 'dark';
    get().setThemeMode(nextMode);
  },
  setThemeMode: (mode: ThemeMode) => {
    const theme = mode === 'dark' ? darkTheme : lightTheme;
    set({ themeMode: mode, theme, isDark: mode === 'dark' });
    AsyncStorage.setItem(STORAGE_KEY, mode).catch((err) =>
      console.warn('Failed to save theme preference', err)
    );
  },
  loadSavedTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        const theme = saved === 'dark' ? darkTheme : lightTheme;
        set({ themeMode: saved, theme, isDark: saved === 'dark' });
      }
    } catch (e) {
      console.warn('Failed to load theme setting', e);
    }
  },
}));
