import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import eslintPlugin from "vite-plugin-eslint";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), svgr()],
	resolve: {
		alias: {
			src: "/src",
		},
	},
});
