/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14213D",
        paper: "#F7F7F5",
        accent: "#2A6F63",
        accentSoft: "#E4EFEC",
        line: "#DEDEDA",
        alert: "#B3541E",
        alertSoft: "#F5E6DC",
        muted: "#6B7280",
        surface: "#FFFFFF",
      },
      fontFamily: {
        display: ["'Source Serif 4'", "Georgia", "serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
