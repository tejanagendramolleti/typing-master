/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          950: '#05070f',
          900: '#0a0f1e',
          800: '#101830',
          700: '#1a2440',
        },
        neon: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
        },
        pulse: {
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'caret-blink': {
          '0%, 45%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        'char-pop': {
          '0%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
        'drift': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(24px, -18px)' },
        },
        'rise': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'caret-blink': 'caret-blink 1.05s step-end infinite',
        'char-pop': 'char-pop 120ms ease-out',
        drift: 'drift 14s ease-in-out infinite',
        rise: 'rise 320ms ease-out both',
      },
      boxShadow: {
        glow: '0 0 24px -6px rgba(34, 211, 238, 0.55)',
        'glow-soft': '0 0 48px -12px rgba(139, 92, 246, 0.5)',
        panel: '0 1px 2px rgba(0,0,0,0.5), 0 16px 48px -24px rgba(0,0,0,0.7)',
      },
    },
  },
  plugins: [],
}
