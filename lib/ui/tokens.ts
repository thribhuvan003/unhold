/**
 * Design tokens — change fonts/colors/spacing here for a full UI refresh.
 * Components should prefer these over hard-coded hex values.
 * @see docs/FRONTEND_POLICY.md
 */

export const colors = {
  navy: '#0B1F33',
  primary: '#1F6B8A',
  accent: '#E67E00',
  surface: '#F8FAFC',
  border: '#E2E8F0',
} as const;

export const fonts = {
  sans: "'IBM Plex Sans', system-ui, sans-serif",
  /** Swap in Phase 2 — e.g. 'Inter', 'Noto Sans Devanagari' */
  display: "'IBM Plex Sans', system-ui, sans-serif",
} as const;

export const spacing = {
  touchMinPx: 44,
  contentMaxWidth: 'max-w-5xl',
} as const;

export const motion = {
  /** Deferred — enable when UI polish slice starts */
  enabled: false,
} as const;

export const brand = {
  publicName: 'Unhold',
  tagline: 'Unfreeze your bank account — step by step',
} as const;