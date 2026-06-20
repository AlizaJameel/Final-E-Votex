/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        evotex: {
          sidebar: '#14532d',
          'sidebar-active': '#22c55e',
          primary: '#16a34a',
          'primary-hover': '#15803d',
          mint: '#ecfdf5',
          'mint-border': '#bbf7d0',
          surface: '#f8fafc',
          muted: '#6b7280',
          danger: '#ef4444',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1rem',
        input: '0.75rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
      },
      maxWidth: {
        page: '80rem',
      },
    },
  },
  plugins: [],
};
