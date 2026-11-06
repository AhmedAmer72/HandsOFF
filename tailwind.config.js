/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14100E",
        panel: "#2B2A33",
        panel2: "#3E3C4A",
        gold: "#F2C14E",
        ember: "#FF5A1F",
        torch: "#FF9A3C",
        parchment: "#E9D8B4",
        memory: "#3FA7A0",
        rust: "#B5532E",
        blood: "#8E1B1B",
      },
      fontFamily: {
        display: ["Cinzel", "Palatino Linotype", "Palatino", "serif"],
        body: ["Source Sans 3", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        panel: "0 18px 50px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};
