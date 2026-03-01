import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#f59e0b", foreground: "#000000" }, // amber — audit log feel
      },
    },
  },
  plugins: [],
};
export default config;
