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
        fog: "#1B1A22",
        inktext: "#3A2A1A",
        bronze: "#8C6239",
        steel: "#1A1714",
        channel: "#0E0C0B",
      },
      fontFamily: {
        display: ["Lilita One", "Baloo 2", "cursive"],
        camp: ["Black Ops One", "Lilita One", "cursive"],
        body: ["Fredoka", "Baloo 2", "sans-serif"],
      },
      borderRadius: {
        hud: "1rem",
      },
      boxShadow: {
        panel: "0 18px 40px rgba(0,0,0,0.45)",
        hud: "0 10px 28px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
