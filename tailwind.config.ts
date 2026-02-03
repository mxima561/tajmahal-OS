import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        gold: {
          50: '#FFF9E6',
          100: '#FFF0BF',
          200: '#FFE699',
          300: '#FFD966',
          400: '#FFCC33',
          500: '#D4A843',
          600: '#B8922E',
          700: '#8C6D1F',
          800: '#604A14',
          900: '#34280A',
        },
        night: {
          50: '#F5F5F5',
          100: '#E0E0E0',
          200: '#B3B3B3',
          300: '#808080',
          400: '#4D4D4D',
          500: '#2A2A2A',
          600: '#1F1F1F',
          700: '#171717',
          800: '#0F0F0F',
          900: '#0A0A0A',
          950: '#050505',
        },
        'taj-black': '#0b0c0e',
        'taj-dark': '#19191a',
        'taj-gold': '#d4af37',
        'taj-white': '#f5f5f5',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-display)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
