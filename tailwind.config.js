/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Kadence design system
        brand: {
          bg: '#111827',        // gray-900 — main background
          surface: '#1F2937',   // gray-800 — cards / surfaces
          elevated: '#374151',  // gray-700 — elevated surfaces
          accent: '#3B82F6',    // blue-500 — electric blue accent
          glow: '#60A5FA',      // blue-400 — accent glow / lighter variant
          text: '#F9FAFB',      // gray-50  — primary text
          muted: '#9CA3AF',     // gray-400 — secondary / muted text
          success: '#10B981',   // emerald-500
          warning: '#F59E0B',   // amber-500
          danger: '#EF4444',    // red-500
        }
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'accent': '0 0 20px rgba(59, 130, 246, 0.3)',
        'accent-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
