import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          950: 'rgb(var(--color-bg) / <alpha-value>)',
          900: 'rgb(var(--color-surface) / <alpha-value>)',
          850: 'rgb(var(--color-surface-muted) / <alpha-value>)',
          800: 'rgb(var(--color-surface-raised) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          muted: 'rgb(var(--color-surface-muted) / <alpha-value>)',
          raised: 'rgb(var(--color-surface-raised) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          muted: 'rgb(var(--color-ink-muted) / <alpha-value>)',
          subtle: 'rgb(var(--color-ink-subtle) / <alpha-value>)',
        },
        accent: {
          low: 'rgb(var(--accent-low) / <alpha-value>)',
          high: 'rgb(var(--accent-high) / <alpha-value>)',
          info: 'rgb(var(--accent-info) / <alpha-value>)',
          glow: 'rgb(var(--accent-glow) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          strong: 'rgb(var(--color-border-strong) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Space Grotesk',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card-soft': '0 18px 60px rgba(6, 10, 18, 0.55)',
        'glow-high': '0 0 45px rgb(var(--accent-high) / 0.35)',
        'glow-low': '0 0 45px rgb(var(--accent-low) / 0.28)',
        'glow-cyan': '0 0 55px rgb(var(--accent-info) / 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'slide-up': 'slideUp 0.35s ease-out',
        'grid-drift': 'gridDrift 18s linear infinite',
        'glow-pulse': 'glowPulse 2.8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gridDrift: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(6%)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
