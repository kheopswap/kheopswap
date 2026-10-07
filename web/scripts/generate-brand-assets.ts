/**
 * Derives every static brand asset in public/ from public/logo.svg.
 *
 * The og-image is rendered by headless Chrome so it can use DM Sans.
 * Set CHROME_PATH when Chrome is not at its default macOS location.
 *
 * Run from the repository root:
 *   pnpm generate-brand-assets
 */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";

const PUBLIC_DIR = resolve(import.meta.dirname, "../public");
const DM_SANS_PATH = resolve(
	import.meta.dirname,
	"../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
);
const CHROME_PATH =
	process.env.CHROME_PATH ??
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const logo = readFileSync(join(PUBLIC_DIR, "logo.svg"), "utf8").trim();
const logoMatch = logo.match(/^<svg[^>]*viewBox="([^"]+)"[^>]*>(.*)<\/svg>$/s);
if (!logoMatch?.[1] || !logoMatch[2])
	throw new Error("logo.svg must be a single <svg> root with a viewBox");
const [, viewBox, markBody] = logoMatch;

const paintMark = (color: string) => markBody.replaceAll("currentColor", color);

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
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * cornerRatio}" fill="#000"/><svg x="${offset}" y="${offset}" width="${markSize}" height="${markSize}" viewBox="${viewBox}">${paintMark("#fff")}</svg></svg>`;
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

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const ogImageHtml = () => {
	const font = readFileSync(DM_SANS_PATH).toString("base64");
	return `<!doctype html>
<html>
<head>
<style>
@font-face { font-family: "DM Sans"; font-weight: 100 1000; src: url(data:font/woff2;base64,${font}) format("woff2"); }
* { margin: 0; box-sizing: border-box; }
body {
	width: ${OG_WIDTH}px; height: ${OG_HEIGHT}px; padding: 88px 96px;
	display: flex; flex-direction: column; justify-content: space-between;
	background: #000; color: #f5f5f5; font-family: "DM Sans";
}
h1 { font-size: 136px; font-weight: 700; line-height: 1; letter-spacing: -0.045em; }
p { margin-top: 28px; font-size: 40px; font-weight: 400; color: #8a8a8a; letter-spacing: -0.01em; }
</style>
</head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="${viewBox}">${paintMark("#f5f5f5")}</svg>
<div>
<h1>Kheopswap</h1>
<p>Decentralized exchange app for Polkadot</p>
</div>
</body>
</html>`;
};

// Headless Chrome on macOS keeps running after --screenshot, so stop it once the file is written.
const screenshotWithChrome = (url: string, outPath: string, workDir: string) =>
	new Promise<void>((resolvePromise, reject) => {
		const chrome = spawn(CHROME_PATH, [
			"--headless=new",
			"--hide-scrollbars",
			"--force-device-scale-factor=1",
			`--user-data-dir=${join(workDir, "profile")}`,
			`--window-size=${OG_WIDTH},${OG_HEIGHT}`,
			`--screenshot=${outPath}`,
			url,
		]);
		const timeout = setTimeout(() => {
			chrome.kill();
			reject(new Error("Chrome did not write the screenshot within 30s"));
		}, 30_000);
		chrome.on("error", reject);
		chrome.stderr.on("data", (chunk: Buffer) => {
			if (!chunk.toString().includes("bytes written to file")) return;
			clearTimeout(timeout);
			chrome.kill();
			resolvePromise();
		});
	});

const renderOgImage = async () => {
	const workDir = mkdtempSync(join(tmpdir(), "kheopswap-og-"));
	try {
		const htmlPath = join(workDir, "og.html");
		const screenshotPath = join(workDir, "og.png");
		writeFileSync(htmlPath, ogImageHtml());
		await screenshotWithChrome(`file://${htmlPath}`, screenshotPath, workDir);
		const screenshot = sharp(screenshotPath);
		const { width, height } = await screenshot.metadata();
		if (width !== OG_WIDTH || height !== OG_HEIGHT)
			throw new Error(`Chrome screenshot is ${width}x${height}`);
		return await screenshot.png({ compressionLevel: 9 }).toBuffer();
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}
};

const write = (file: string, data: string | Buffer) => {
	writeFileSync(join(PUBLIC_DIR, file), data);
	console.log(`wrote public/${file}`);
};

write(
	"favicon.svg",
	`${logo.replace(
		/^(<svg[^>]*>)/,
		"$1<style>svg{color:#000}@media (prefers-color-scheme:dark){svg{color:#fff}}</style>",
	)}\n`,
);
write("safari-pinned-tab.svg", `${logo.replaceAll("currentColor", "#000")}\n`);

const renderedTiles = await Promise.all(
	TILES.map(async (tile) => ({ ...tile, data: await renderTile(tile) })),
);
for (const { file, data } of renderedTiles) write(file, data);

write(
	"favicon.ico",
	toIco(renderedTiles.filter(({ file }) => file.startsWith("favicon-"))),
);
write("og-image.png", await renderOgImage());
