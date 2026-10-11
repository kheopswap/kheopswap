import { describe, expect, it } from "vitest";
import { getDominantColor } from "./getDominantColor";

type Rgba = [number, number, number, number];

const pixelsOf = (...runs: [Rgba, number][]) =>
	Uint8ClampedArray.from(
		runs.flatMap(([rgba, count]) =>
			Array.from({ length: count }, () => rgba).flat(),
		),
	);

const TEAL: Rgba = [60, 170, 160, 255];
const RED: Rgba = [220, 40, 40, 255];
const WHITE: Rgba = [255, 255, 255, 255];
const BLACK: Rgba = [0, 0, 0, 255];
const GREY: Rgba = [128, 128, 128, 255];
const TRANSPARENT_RED: Rgba = [220, 40, 40, 0];

describe("getDominantColor", () => {
	it("returns the colour covering most vivid pixels", () => {
		const pixels = pixelsOf([TEAL, 900], [RED, 300], [WHITE, 400]);
		expect(getDominantColor(pixels)).toBe("rgb(60 170 160)");
	});

	it("ignores white, black and grey even when they dominate", () => {
		const pixels = pixelsOf([WHITE, 800], [BLACK, 600], [RED, 200]);
		expect(getDominantColor(pixels)).toBe("rgb(220 40 40)");
	});

	it("returns null for a monochrome logo", () => {
		const pixels = pixelsOf([WHITE, 500], [BLACK, 900], [GREY, 200]);
		expect(getDominantColor(pixels)).toBeNull();
	});

	it("ignores transparent pixels", () => {
		const pixels = pixelsOf([TRANSPARENT_RED, 1500], [BLACK, 100]);
		expect(getDominantColor(pixels)).toBeNull();
	});

	it("returns null when the colour is only a speck", () => {
		const pixels = pixelsOf([BLACK, 1590], [RED, 10]);
		expect(getDominantColor(pixels)).toBeNull();
	});

	it("averages the shades that fall in the same bucket", () => {
		const pixels = pixelsOf(
			[[200, 40, 40, 255], 100],
			[[210, 50, 40, 255], 100],
		);
		expect(getDominantColor(pixels)).toBe("rgb(205 45 40)");
	});

	it("returns null for an empty image", () => {
		expect(getDominantColor(new Uint8ClampedArray())).toBeNull();
	});
});
