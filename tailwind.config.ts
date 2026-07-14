import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#13141B",
        inkSoft: "#1B1D27",
        ink600: "#3A3D49",
        paper: "#F5F5F2",
        paperDim: "#EDECE7",
        line: "#E3E1DA",
        berry: "#AF3358",
        berrySoft: "#F3DEE5",
        amber: "#D69A32",
        amberSoft: "#F7ECD6",
        sage: "#4C8A67",
        sageSoft: "#DDEBE1",
        slate: "#6B6E77",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        card: "0px 2px 4px rgba(19, 20, 27, 0.04)",
      }
    },
  },
  plugins: [],
};
export default config;