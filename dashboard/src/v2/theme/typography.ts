export const typography = {
  fontFamily: {
    sans: 'var(--font-sans)',
    mono: 'var(--font-mono)',
    display: 'var(--font-display)',
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1.35' }],
    sm: ['0.875rem', { lineHeight: '1.4' }],
    base: ['1rem', { lineHeight: '1.45' }],
    lg: ['1.125rem', { lineHeight: '1.5' }],
    xl: ['1.25rem', { lineHeight: '1.4' }],
    '2xl': ['1.5rem', { lineHeight: '1.3' }],
    '3xl': ['1.875rem', { lineHeight: '1.2' }],
    '4xl': ['2.25rem', { lineHeight: '1.1' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  letterSpacing: {
    tighter: '-0.02em',
    tight: '-0.015em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em',
  },
};
