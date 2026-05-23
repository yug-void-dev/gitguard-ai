/**
 * @file hooks/useTheme.ts
 * @description Convenience hook that consumes ThemeContext.
 * Throws a clear error if used outside <ThemeProvider>.
 */

import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

/**
 * Returns the current theme state and controls.
 *
 * @example
 *   const { theme, toggleTheme, isDark } = useTheme();
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return context;
};
