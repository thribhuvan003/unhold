/**
 * Design tokens — sky blue × cement palette, humane type pairing.
 * @see docs/FRONTEND_POLICY.md
 */

export const colors = {
  ink: '#2E3238',
  inkMuted: '#5C6169',
  inkFaint: '#8C9199',
  paper: '#E6E4DE',
  surface: '#EDEBE6',
  surfaceRaised: '#F7F6F2',
  border: '#D0CDC5',
  borderStrong: '#B5B1A8',
  cement: '#A8A59C',
  cementDeep: '#6E6B64',
  cementDark: '#43474D',
  sky: '#4FA3D4',
  skyDeep: '#2B7DAD',
  skyLight: '#7EC0E8',
  skyMist: '#D4EBF7',
  /** Legacy semantic aliases — components still reference these */
  forest: '#2B7DAD',
  forestLight: '#4FA3D4',
  terracotta: '#4FA3D4',
  terracottaHover: '#2B7DAD',
  saffron: '#C4922A',
  sage: '#4AADA3',
  slate: '#5A6E7A',
  navy: '#2E3238',
  primary: '#4FA3D4',
  accent: '#2B7DAD',
} as const;

export const fonts = {
  sans: 'var(--font-body), system-ui, sans-serif',
  display: 'var(--font-display), system-ui, sans-serif',
  mono: 'var(--font-mono), ui-monospace, monospace',
} as const;

export const spacing = {
  touchMinPx: 44,
  contentMaxWidth: 'max-w-5xl',
} as const;

export const motion = {
  enabled: true,
  durationFast: '140ms',
  durationNormal: '220ms',
  durationSlow: '380ms',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const brand = {
  publicName: 'Unhold',
  tagline: 'Prepare your official freeze grievance',
} as const;
