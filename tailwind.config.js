/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-bg': '#111827',
        'brand-surface': '#1F2937',
        'brand-elevated': '#374151',
        'brand-accent': '#3B82F6',
        'brand-accent-glow': '#60A5FA',
        'brand-text': '#F9FAFB',
        'brand-text-secondary': '#9CA3AF',
        'brand-muted': '#9CA3AF',
        'brand-success': '#10B981',
        'brand-warning': '#F59E0B',
        'brand-danger': '#EF4444',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-sm': '0 0 10px rgba(59, 130, 246, 0.2)',
      }
    },
  },
  plugins: [],
}
