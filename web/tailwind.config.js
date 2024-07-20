import Color from "color";
import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

const palette = (color) => {
  const c = Color(color);

  const palette = {
    DEFAULT: c.hex(),
    500: c.hex(),
  };

  for (let i = 50; i <= 450; i += 50) {
    const ratio = 1 - i / 500;
    palette[i] = c.lighten(ratio).hex();
    palette[1000 - i] = c.darken(ratio).hex();
  }

  return palette;
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",

      white: "#ffffff",
      black: "#000000",

      primary: palette("#552BBF"),
      secondary: palette("#E6007A"),
      neutral: palette(colors.zinc[500]),

      error: palette(colors.red[500]),
      warn: palette(colors.orange[500]),
      success: palette(colors.green[500]),

      // polkadot officials
      cyan: palette("#00B2FF"),
      lime: palette("#D3FF33"),
      green: palette("#56F39A"),
      pink: palette("#E6007A"),
      purple: palette("#552BBF"),
    },
    extend: {
      fontFamily: {
        sans: ['"Lexend Deca Variable"', ...defaultTheme.fontFamily.sans],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // something breaks the built-in tailwind spin... framer-motion ?
        "spin-custom": {
          "0%": {
            transform: "rotate(0deg)",
          },
          "100%": {
            transform: "rotate(360deg)",
          },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        spin: "spin-custom 1s linear infinite",
      },
    },
  },
  plugins: [],
};
