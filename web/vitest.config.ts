import { defineConfig } from "vitest/config";
import { tokenColors } from "./plugins/tokenColors.ts";

export default defineConfig({
	plugins: [tokenColors()],
	test: {
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		environment: "jsdom",
		setupFiles: ["src/test-setup.ts"],
	},
});
