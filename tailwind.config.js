/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12121A",
        panel: "#1B1B26",
        panel2: "#232332",
        line: "#2E2E40",
        violet: {
          DEFAULT: "#7C5CFC",
          soft: "#9B82FF",
          dim: "#5A43B8",
        },
        coral: "#FF6B4A",
        mint: "#3DDC84",
        amber: "#F5B942",
        ivory: "#F2F0F5",
        mute: "#8C89A3",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        node: "10px",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,92,252,0.3), 0 8px 30px rgba(124,92,252,0.15)",
      },
    },
  },
  plugins: [],
};
