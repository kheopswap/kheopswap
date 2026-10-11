/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module "@fontsource-variable/dm-sans";
declare module "@fontsource-variable/jetbrains-mono";

declare module "virtual:token-colors" {
	const tokenColors: Record<string, string>;
	export default tokenColors;
}
