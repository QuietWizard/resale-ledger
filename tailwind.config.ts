import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#E9E4D6",
        "paper-card": "#F5F1E6",
        ink: "#2B2A26",
        "ink-soft": "#6B6459",
        ledger: {
          DEFAULT: "#3F5A48",
          dark: "#2C4033",
        },
        stamp: "#9B3A2E",
        brass: "#B08D3E",
        line: "#D8D0BC",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(43,42,38,0.08), 0 2px 8px rgba(43,42,38,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
