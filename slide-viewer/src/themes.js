// Built-in theme presets.
// Keys map to CSS custom properties (snake_case → --kebab-case).
// All values are strings suitable for CSS.

export const PRESETS = {
  dark: {
    bg: '#111111',
    surface: '#1a1a1a',
    surface2: '#2a2a2a',
    border: '#333333',
    border2: '#444444',
    text: '#eeeeee',
    'text-dim': 'rgba(238,238,238,0.5)',
    'text-faint': 'rgba(238,238,238,0.25)',
    accent: '#7c3aed',
    'font-sans': 'system-ui, sans-serif',
    'font-heading': 'system-ui, sans-serif',
  },
  light: {
    bg: '#f5f5f5',
    surface: '#ffffff',
    surface2: '#eeeeee',
    border: '#dddddd',
    border2: '#cccccc',
    text: '#111111',
    'text-dim': 'rgba(0,0,0,0.5)',
    'text-faint': 'rgba(0,0,0,0.25)',
    accent: '#7c3aed',
    'font-sans': 'system-ui, sans-serif',
    'font-heading': 'system-ui, sans-serif',
  },
  terminal: {
    bg: '#0d0d0d',
    surface: '#141414',
    surface2: '#1e1e1e',
    border: '#2a2a2a',
    border2: '#3a3a3a',
    text: '#00ff88',
    'text-dim': 'rgba(0,255,136,0.5)',
    'text-faint': 'rgba(0,255,136,0.25)',
    accent: '#00ff88',
    'font-sans': 'ui-monospace, Consolas, monospace',
    'font-heading': 'ui-monospace, Consolas, monospace',
  },
  paper: {
    bg: '#faf7f2',
    surface: '#ffffff',
    surface2: '#f0ece4',
    border: '#e0d8cc',
    border2: '#c8bfb0',
    text: '#2c2416',
    'text-dim': 'rgba(44,36,22,0.55)',
    'text-faint': 'rgba(44,36,22,0.25)',
    accent: '#c0392b',
    'font-sans': 'Georgia, serif',
    'font-heading': 'Georgia, serif',
  },
};

/**
 * Merge preset + TOML overrides, return flat object of CSS var name → value.
 * TOML keys use underscores (e.g. text_dim), CSS vars use dashes.
 */
export function resolveTheme(metaTheme = 'dark', themeOverrides = {}) {
  const preset = PRESETS[metaTheme] || PRESETS.dark;
  const merged = { ...preset };

  for (const [k, v] of Object.entries(themeOverrides)) {
    merged[k.replace(/_/g, '-')] = v;
  }

  // Return as { '--bg': '#111', ... }
  return Object.fromEntries(
    Object.entries(merged).map(([k, v]) => [`--${k}`, v])
  );
}
