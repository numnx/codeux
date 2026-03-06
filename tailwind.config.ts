import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  darkMode: "class",
  content: ["./dashboard/index.html", "./dashboard/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: {
          900: "#030303",
          800: "#0A0A0A",
          700: "#121212",
        },
        aura: {
          500: "#FF3366", // Molten Coral
          600: "#00E5FF", // Electric Cyan
        },
        pantone: {
          green: "#00AB84", // Running success
          red: "#E3000F",   // Failed
          violet: "#A300D6" // Intervention
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [typography],
} satisfies Config;
