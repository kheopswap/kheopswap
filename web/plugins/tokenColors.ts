import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import type { Plugin } from "vite";
import { getDominantColor } from "../src/utils/getDominantColor.ts";

const MODULE_ID = "virtual:token-colors";
const RESOLVED_MODULE_ID = `\0${MODULE_ID}`;
const PUBLIC_DIR = resolve(import.meta.dirname, "../public");
const LOGOS_DIR = "img/tokens";
const SAMPLE_SIZE = 40;
const IMAGE_EXTENSIONS = /\.(svg|png|webp|jpe?g)$/;

const readLogoColor = async (path: string) => {
	const pixels = await sharp(path)
		.resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
		.ensureAlpha()
		.raw()
		.toBuffer();
	return getDominantColor(new Uint8ClampedArray(pixels));
};

const getTokenColors = async () => {
	const files = await readdir(join(PUBLIC_DIR, LOGOS_DIR), { recursive: true });
	const entries = await Promise.all(
		files
			.filter((file) => IMAGE_EXTENSIONS.test(file))
			.map(async (file) => {
				const logo = `${LOGOS_DIR}/${file}`;
				return [logo, await readLogoColor(join(PUBLIC_DIR, logo))] as const;
			}),
	);
	return Object.fromEntries(entries.filter(([, color]) => color));
};

export const tokenColors = (): Plugin => ({
	name: "token-colors",
	resolveId: (id) => (id === MODULE_ID ? RESOLVED_MODULE_ID : undefined),
	load: async (id) =>
		id === RESOLVED_MODULE_ID
			? `export default ${JSON.stringify(await getTokenColors())};`
			: undefined,
});
