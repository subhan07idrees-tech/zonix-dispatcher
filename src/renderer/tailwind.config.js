/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'zonix': {
          'base': '#0b0f19',
          'surface': '#121824',
          'surface-light': '#1b2336',
          'border': '#222d42',
          'border-light': '#31415e',
          'cyan': '#3b82f6',
          'cyan-dim': '#1d4ed8',
          'purple': '#7c3aed',
          'purple-dim': '#5b21b6',
          'crimson': '#ef4444',
          'crimson-dim': '#b91c1c',
          'text': '#f3f4f6',
          'text-dim': '#9ca3af',
          'text-muted': '#6b7280',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)' },
        }
      }
    },
  },
  plugins: [],
};
