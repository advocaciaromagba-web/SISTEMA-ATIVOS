import type { Config } from "tailwindcss";

/**
 * As cores da marca NAO ficam escritas aqui. Elas sao variaveis CSS definidas
 * em globals.css e alimentadas pelo .env (MARCA_COR_*), para que a empresa
 * gestora troque a identidade visual sem tocar no codigo.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        marca: {
          DEFAULT: "var(--marca)",
          escura: "var(--marca-escura)",
          clara: "var(--marca-clara)",
          contraste: "var(--marca-contraste)",
          destaque: "var(--marca-destaque)",
        },
      },
      fontFamily: {
        sans: ["var(--fonte-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
