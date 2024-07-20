module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:tailwindcss/recommended",
  ],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "react", "react-refresh"],
  rules: {
    "@typescript-eslint/no-unused-vars": "warn",
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",
    "import/no-unresolved": "off", // Handled by TypeScript... i know... it sucks
    "import/no-relative-parent-imports": "error",
    "import/order": [
      "warn",
      {
        "newlines-between": "always",
      },
    ],
    "import/no-duplicates": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "react-refresh/only-export-components": "warn",
  },
  settings: {
    "import/internal-regex": "^src/",
    react: {
      version: "detect",
    },
    tailwindcss: {
      callees: ["clsx", "cn", "classNames", "twMerge"],
      config: __dirname + "/tailwind.config.js",
    },
  },
};
