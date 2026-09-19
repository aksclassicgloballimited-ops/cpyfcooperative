import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: "#6A11CB",
        plum: "#4C1D95",
        violetSoft: "#E9D5FF",
        accent: "#FACC15",
      },
      boxShadow: {
        soft: "0 18px 60px rgba(76, 29, 149, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
