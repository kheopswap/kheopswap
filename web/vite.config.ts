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
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					const normalized = id.replaceAll("\\", "/");
					if (
						normalized.includes("/node_modules/viem/") ||
						normalized.includes("/node_modules/ox/")
					) {
						return "viem";
					}
				},
			},
		},
	},
	optimizeDeps: {
		exclude: ["../.papi"],
	},
	define: {
		"process.env": {}, // workaround WalletConnect provider bug
	},
});
