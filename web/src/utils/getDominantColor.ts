const MIN_ALPHA = 200;
const MIN_SATURATION = 0.35;
const MIN_LIGHTNESS = 0.18;
const MAX_LIGHTNESS = 0.85;
const MIN_BUCKET_SHARE = 0.0125;

type ColorBucket = { count: number; r: number; g: number; b: number };

const isVividPixel = (r: number, g: number, b: number, a: number) => {
	if (a < MIN_ALPHA) return false;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const lightness = (max + min) / 510;
	const saturation =
		max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
	return (
		saturation >= MIN_SATURATION &&
		lightness >= MIN_LIGHTNESS &&
		lightness <= MAX_LIGHTNESS
	);
};

export const getDominantColor = (pixels: Uint8ClampedArray): string | null => {
	const buckets = new Map<string, ColorBucket>();

	for (let i = 0; i + 3 < pixels.length; i += 4) {
		const r = pixels[i] as number;
		const g = pixels[i + 1] as number;
		const b = pixels[i + 2] as number;
		if (!isVividPixel(r, g, b, pixels[i + 3] as number)) continue;

		const key = `${r >> 5},${g >> 5},${b >> 5}`;
		const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
		bucket.count++;
		bucket.r += r;
		bucket.g += g;
		bucket.b += b;
		buckets.set(key, bucket);
	}

	let best: ColorBucket | undefined;
	for (const bucket of buckets.values())
		if (!best || bucket.count > best.count) best = bucket;

	const pixelCount = pixels.length / 4;
	if (!best || best.count <= pixelCount * MIN_BUCKET_SHARE) return null;

	const { count, r, g, b } = best;
	const average = (sum: number) => Math.round(sum / count);
	return `rgb(${average(r)} ${average(g)} ${average(b)})`;
};
