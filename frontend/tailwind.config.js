/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#161C27",
        paper: "#EEF0F1",
        accent: "#A8813C",
        accentSoft: "#F2E8D5",
        line: "#E0E2E4",
        alert: "#B3541E",
        alertSoft: "#F5E6DC",
        muted: "#6B7280",
        surface: "#FFFFFF",
      },
      fontFamily: {
        display: ["'Poppins'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
