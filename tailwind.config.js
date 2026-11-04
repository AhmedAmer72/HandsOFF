/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#100c0a",
        panel: "#241812",
        panel2: "#1a120f",
        gold: "#e4c48a",
        ember: "#ff7a3c",
        parchment: "#f3e2c4",
        blood: "#c4493a",
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
