import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",      // Головна папка (включає і page.tsx, і components)
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // Якщо раптом винесеш компоненти назовні
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;