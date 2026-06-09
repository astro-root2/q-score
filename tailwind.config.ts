// @ts-nocheck
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#b9cdff',
          300: '#89a8ff',
          400: '#5578ff',
          500: '#2d4fff',
          600: '#1832f5',
          700: '#1425e1',
          800: '#1720b6',
          900: '#192090',
          950: '#111455',
        },
      },
      animation: {
        'flash-green': 'flash-green 0.4s ease-out',
        'flash-red':   'flash-red   0.4s ease-out',
        'pulse-slow':  'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':    'slide-in 0.2s ease-out',
      },
      keyframes: {
        'flash-green': {
          '0%':   { backgroundColor: 'rgb(34 197 94)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-red': {
          '0%':   { backgroundColor: 'rgb(239 68 68)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
