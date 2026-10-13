/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F7F7F5',
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#F1F1ED',
        },
        'row-hover': '#FAFAF8',
        line: {
          DEFAULT: '#E6E6E1',
          soft: '#EFEFEA',
          input: '#D9D9D3',
        },
        ink: {
          DEFAULT: '#14161B',
          2: '#5B606B',
          3: '#6A6F7B',
        },
        accent: {
          DEFAULT: '#2447D6',
          hover: '#1C39B0',
          press: '#162E91',
          wash: '#EEF1FD',
        },
        ok: {
          DEFAULT: '#1A7F55',
          bg: '#E4F4EB',
          ink: '#14633F',
        },
        warn: {
          DEFAULT: '#C77700',
          bg: '#FBF1DC',
          ink: '#8A5300',
        },
        err: {
          DEFAULT: '#B4261E',
          bg: '#FDECEA',
          ink: '#8F1D17',
        },
      },
      borderRadius: {
        ctl: '8px',
        card: '12px',
        pill: '999px',
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono Variable"', '"Geist Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        none: 'none',
        modal: '0 8px 24px rgba(20,22,27,0.12)',
        dropdown: '0 8px 24px rgba(20,22,27,0.12)',
      },
      transitionDuration: {
        DEFAULT: '120ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
