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
        'sans': ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        'modal': '0 20px 30px -10px rgba(15, 23, 42, 0.25), 0 10px 15px -5px rgba(15, 23, 42, 0.15)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'page-slide': 'pageSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'card-shake': 'cardShake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'radar-ping': 'radarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'stream-highlight': 'streamHighlight 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 2s infinite linear',
        'breath-glow': 'breathGlow 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(30, 64, 175, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(30, 64, 175, 0.4)' },
        },
        pageSlideIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cardShake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-3px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(3px, 0, 0)' },
        },
        radarPing: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '75%, 100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        streamHighlight: {
          '0%': { backgroundColor: 'rgba(236, 253, 245, 0.85)' },
          '100%': { backgroundColor: 'transparent' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        breathGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(0.98)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
      }
    },
  },
  plugins: [],
};
