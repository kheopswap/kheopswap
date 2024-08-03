import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), svgr(), checker({ typescript: true, biome: true })],
	resolve: {
		alias: {
			src: "/src",
		},
	},
});
