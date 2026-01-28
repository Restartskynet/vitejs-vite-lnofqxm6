import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0a0b0f',
          900: '#12141a',
          850: '#181a22',
          800: '#22242e',
        },
        surface: {
          DEFAULT: 'rgb(18 21 28 / <alpha-value>)',
          muted: 'rgb(21 25 35 / <alpha-value>)',
          raised: 'rgb(28 34 48 / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(231 237 245 / <alpha-value>)',
          muted: 'rgb(147 160 180 / <alpha-value>)',
          subtle: 'rgb(107 114 128 / <alpha-value>)',
        },
        accent: {
          low: 'rgb(245 158 11 / <alpha-value>)',
          high: 'rgb(16 185 129 / <alpha-value>)',
          info: 'rgb(56 189 248 / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(148 163 184 / <alpha-value>)',
          strong: 'rgb(148 163 184 / <alpha-value>)',
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
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card-soft': '0 18px 60px rgba(6, 10, 18, 0.55)',
        'glow-high': '0 0 40px rgba(16, 185, 129, 0.25)',
        'glow-low': '0 0 40px rgba(245, 158, 11, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'slide-up': 'slideUp 0.35s ease-out',
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
      },
    },
  },
  plugins: [],
} satisfies Config;
