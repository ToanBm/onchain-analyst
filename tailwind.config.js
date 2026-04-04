/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        terminal: {
          bg: '#0a0e0f',
          surface: '#0f1517',
          border: '#1a2428',
          muted: '#7a8a99',
          text: '#c8d6e0',
          green: '#00ff9d',
          'green-dim': '#00cc7a',
          red: '#ff4545',
          amber: '#ffb347',
          blue: '#4da6ff',
        },
      },
      animation: {
        'cursor-blink': 'blink 1s step-end infinite',
        'scan-in': 'scanIn 0.4s ease-out forwards',
        'fade-up': 'fadeUp 0.3s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanIn: {
          '0%': { clipPath: 'inset(0 100% 0 0)', opacity: '0' },
          '100%': { clipPath: 'inset(0 0% 0 0)', opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 4px currentColor' },
          '50%': { boxShadow: '0 0 12px currentColor, 0 0 24px currentColor' },
        },
      },
    },
  },
  plugins: [],
}
