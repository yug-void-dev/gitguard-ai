/**
 * @file context/ThemeContext.tsx
 * @description Dark / light mode context.
 * The current theme is persisted to localStorage so it survives page reloads.
 * The <html> element gets a `data-theme` attribute that CSS variables key off.
 */

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS } from '../constants/config';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  /** Override the default theme (useful for testing). */
  defaultTheme?: Theme;
}

/**
 * ThemeProvider wraps the app and exposes the current theme + toggle
 * to any component via useTheme().
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark',
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null;
      return stored === 'light' || stored === 'dark' ? stored : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  /** Apply data-theme attribute to <html> whenever theme changes. */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      // localStorage may be unavailable in some environments
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme, isDark: theme === 'dark' }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
