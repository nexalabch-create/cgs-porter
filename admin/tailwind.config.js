/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        magenta: {
          DEFAULT: '#e91e8c',
          50:  '#fdf2f8',
          100: '#fce7f4',
          200: '#fbcfe7',
          400: '#f472b6',
          500: '#e91e8c',
          600: '#c8127a',
          700: '#a30e64',
        },
        navy: {
          DEFAULT: '#1a1a5e',
          50:  '#f4f4fb',
          100: '#e5e5f1',
          200: '#cbcbe3',
          700: '#1a1a5e',
          800: '#13134a',
          900: '#0d0d33',
        },
        ink: '#0b0b1a',
        muted: '#6b6b7a',
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,15,40,.04), 0 4px 14px rgba(15,15,40,.04)',
        cardHover: '0 4px 12px rgba(15,15,40,.07), 0 16px 30px rgba(15,15,40,.06)',
      },
    },
  },
  plugins: [],
};
