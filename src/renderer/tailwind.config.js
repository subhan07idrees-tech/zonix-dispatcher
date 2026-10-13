/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          hover: 'var(--surface-hover)',
        },
        'row-hover': 'var(--row-hover)',
        line: {
          DEFAULT: 'var(--line)',
          soft: 'var(--line-soft)',
          input: 'var(--line-input)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          press: 'var(--accent-press)',
          wash: 'var(--accent-wash)',
        },
        ok: {
          DEFAULT: 'var(--ok)',
          bg: 'var(--ok-bg)',
          ink: 'var(--ok-ink)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          bg: 'var(--warn-bg)',
          ink: 'var(--warn-ink)',
        },
        err: {
          DEFAULT: 'var(--err)',
          bg: 'var(--err-bg)',
          ink: 'var(--err-ink)',
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
