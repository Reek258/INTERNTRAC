/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Official GHRCE / Raisoni Purple Palette
        purple: {
          950: "#220B38",
          900: "#321153",
          800: "#3F1569",
          700: "#4B1881", // Main Raisoni Purple
          600: "#5D1FA0",
          500: "#7528C9",
          400: "#934DE0",
          200: "#D8B4FE",
          100: "#E9D5FF",
          50: "#FAF5FF",
        },
        // Official GHRCE / Raisoni Orange Palette
        orange: {
          900: "#7C2D12",
          800: "#9A3412",
          700: "#C2410C",
          600: "#D64E07",
          500: "#F26522", // Main Raisoni Orange
          400: "#FB923C",
          200: "#FED7AA",
          100: "#FFEDD5",
          50: "#FFF7ED",
        },
        // Semantic mappings
        secondary: "#4B1881",
        "secondary-container": "#5D1FA0",
        "secondary-fixed": "#E9D5FF",
        "primary-container": "#F26522",
        "primary-fixed": "#FFEDD5",
        surface: "#F8FAFC",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F1F5F9",
        "surface-container": "#E2E8F0",
        "surface-container-highest": "#CBD5E1",
        "on-background": "#0F172A",
        "on-surface": "#1E293B",
        "on-surface-variant": "#475569",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        headline: ['Hanken Grotesk', 'sans-serif'],
      },
      boxShadow: {
        card: "0 2px 12px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02)",
        "card-hover": "0 10px 25px -3px rgba(75, 24, 129, 0.08), 0 4px 6px -4px rgba(75, 24, 129, 0.04)",
        orange: "0 4px 14px rgba(242, 101, 34, 0.35)",
        purple: "0 4px 14px rgba(75, 24, 129, 0.35)",
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite linear',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 7.5s ease-in-out 1.2s infinite',
        'fade-up': 'fadeUp 0.7s ease-out both',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0px)' },
        },
      },
    },
  },
  plugins: [],
}
