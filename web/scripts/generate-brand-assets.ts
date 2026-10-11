import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const PUBLIC_DIR = resolve(import.meta.dirname, "../public");

const logo = readFileSync(join(PUBLIC_DIR, "logo.svg"), "utf8").trim();
const logoMatch = logo.match(/^<svg[^>]*viewBox="([^"]+)"[^>]*>(.*)<\/svg>$/s);
if (!logoMatch?.[1] || !logoMatch[2])
	throw new Error("logo.svg must be a single <svg> root with a viewBox");
const [, viewBox, markBody] = logoMatch;

const LOGO_ACCENT = "var(--logo-accent,#a78bfa)";
const DARK = { body: "#fff", accent: "#3fd8ff" };
const LIGHT = { body: "#000", accent: "#0a66ff" };

const paintMark = ({ body, accent }: { body: string; accent: string }) =>
	markBody.replaceAll("currentColor", body).replaceAll(LOGO_ACCENT, accent);

type Tile = {
	file: string;
	size: number;
	markRatio: number;
	cornerRatio: number;
};

const FAVICON = { markRatio: 0.92, cornerRatio: 0.22 };
const APP_ICON = { markRatio: 0.6, cornerRatio: 0 };

const TILES: Tile[] = [
	{ file: "favicon-16x16.png", size: 16, ...FAVICON },
	{ file: "favicon-32x32.png", size: 32, ...FAVICON },
	{ file: "apple-touch-icon.png", size: 180, ...APP_ICON },
	{ file: "mstile-150x150.png", size: 150, ...APP_ICON },
	{ file: "android-chrome-192x192.png", size: 192, ...APP_ICON },
	{ file: "android-chrome-512x512.png", size: 512, ...APP_ICON },
];

const tileSvg = ({ size, markRatio, cornerRatio }: Tile) => {
	const markSize = size * markRatio;
	const offset = (size - markSize) / 2;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * cornerRatio}" fill="#000"/><svg x="${offset}" y="${offset}" width="${markSize}" height="${markSize}" viewBox="${viewBox}">${paintMark(DARK)}</svg></svg>`;
};

const renderTile = (tile: Tile) =>
	sharp(Buffer.from(tileSvg(tile)))
		.png({ compressionLevel: 9 })
		.toBuffer();

const toIco = (pngs: { size: number; data: Buffer }[]) => {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(pngs.length, 4);

	let offset = header.length + pngs.length * 16;
	const entries = pngs.map(({ size, data }) => {
		const entry = Buffer.alloc(16);
		entry.writeUInt8(size % 256, 0);
		entry.writeUInt8(size % 256, 1);
		entry.writeUInt16LE(1, 4);
		entry.writeUInt16LE(32, 6);
		entry.writeUInt32LE(data.length, 8);
		entry.writeUInt32LE(offset, 12);
		offset += data.length;
		return entry;
	});

	return Buffer.concat([header, ...entries, ...pngs.map(({ data }) => data)]);
};

const write = (file: string, data: string | Buffer) => {
	writeFileSync(join(PUBLIC_DIR, file), data);
	console.log(`wrote public/${file}`);
};

write(
	"favicon.svg",
	`${logo.replace(
		/^(<svg[^>]*>)/,
		`$1<style>svg{color:${LIGHT.body};--logo-accent:${LIGHT.accent}}@media (prefers-color-scheme:dark){svg{color:${DARK.body};--logo-accent:${DARK.accent}}}</style>`,
	)}\n`,
);
write(
	"safari-pinned-tab.svg",
	`${logo.replace(markBody, paintMark({ body: "#000", accent: "#000" }))}\n`,
);

const renderedTiles = await Promise.all(
	TILES.map(async (tile) => ({ ...tile, data: await renderTile(tile) })),
);
for (const { file, data } of renderedTiles) write(file, data);

write(
	"favicon.ico",
	toIco(renderedTiles.filter(({ file }) => file.startsWith("favicon-"))),
);
