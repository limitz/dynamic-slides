import { useEffect } from 'react';
import { resolveTheme } from './themes';

export function useTheme(meta, themeOverrides) {
  useEffect(() => {
    const vars = resolveTheme(meta?.theme, themeOverrides);
    const root = document.documentElement;
    for (const [key, val] of Object.entries(vars)) {
      root.style.setProperty(key, val);
    }
    return () => {
      for (const key of Object.keys(vars)) {
        root.style.removeProperty(key);
      }
    };
  }, [meta?.theme, JSON.stringify(themeOverrides)]);
}
