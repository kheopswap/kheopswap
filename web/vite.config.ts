import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		nodePolyfills(),
		tailwindcss(),
		react(),
		svgr(),
		checker({
			typescript: true,
			biome: true,
			overlay: { initialIsOpen: "error" },
		}),
	],
	resolve: {
		alias: {
			src: "/src",
		},
	},
	optimizeDeps: {
		exclude: ["../packages/papi/.papi"],
	},
	define: {
		"process.env": {}, // workaround WalletConnect provider bug
	},
});
