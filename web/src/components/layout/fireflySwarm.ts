const WANDER_ACCELERATION = 40;
const PULL_ACCELERATION = 28;
const PULL_MIN_DISTANCE = 40;
const PULL_MAX_DISTANCE = 320;
const VELOCITY_KEPT_PER_SECOND = 0.985 ** 120;
const GLOW_RADIUS_PER_SIZE = 7;
const CORE_EXTENT = 0.28;
const GAUSSIAN_SPREAD = 1.4;
const GAUSSIAN_STOPS = 16;
const SPRITE_SIZE = 128;

export type Fly = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	seed: number;
	blinkPhase: number;
	blinkRate: number;
};

export type Bounds = { width: number; height: number; pixelRatio: number };

export type Point = { x: number; y: number };

export type Palette = {
	glow: string;
	core: string;
	composite: GlobalCompositeOperation;
};

const between = (min: number, max: number) => min + Math.random() * (max - min);

const hash = (x: number, y: number) => {
	const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return value - Math.floor(value);
};

const smooth = (t: number) => t * t * (3 - 2 * t);

const noise = (x: number, y: number) => {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const fx = smooth(x - xi);
	const fy = smooth(y - yi);
	const a = hash(xi, yi);
	const b = hash(xi + 1, yi);
	const c = hash(xi, yi + 1);
	const d = hash(xi + 1, yi + 1);
	return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};

export const createFly = ({ width, height }: Bounds): Fly => ({
	x: between(0, width),
	y: between(0, height),
	vx: 0,
	vy: 0,
	size: between(1.2, 2.6),
	seed: between(0, 100),
	blinkPhase: between(0, Math.PI * 2),
	blinkRate: between(0.35, 1.05),
});

const wrap = (value: number, max: number) => (value + max) % max;

export const advanceFly = (
	fly: Fly,
	time: number,
	step: number,
	{ width, height }: Bounds,
	pointer?: Point,
) => {
	fly.vx +=
		(noise(fly.seed + time * 0.2, 0) - 0.5) * WANDER_ACCELERATION * step;
	fly.vy +=
		(noise(0, fly.seed + time * 0.2) - 0.5) * WANDER_ACCELERATION * step;
	if (pointer) {
		const dx = pointer.x - fly.x;
		const dy = pointer.y - fly.y;
		const distance = Math.hypot(dx, dy);
		if (distance > PULL_MIN_DISTANCE && distance < PULL_MAX_DISTANCE) {
			fly.vx += (dx / distance) * PULL_ACCELERATION * step;
			fly.vy += (dy / distance) * PULL_ACCELERATION * step;
		}
	}
	const kept = VELOCITY_KEPT_PER_SECOND ** step;
	fly.vx *= kept;
	fly.vy *= kept;
	fly.x = wrap(fly.x + fly.vx * step, width);
	fly.y = wrap(fly.y + fly.vy * step, height);
};

const brightness = (fly: Fly, time: number) =>
	0.25 + 0.75 * (0.5 + 0.5 * Math.sin(time * fly.blinkRate + fly.blinkPhase));

const paintGaussian = (color: string, extent: number) => {
	const layer = new OffscreenCanvas(SPRITE_SIZE, SPRITE_SIZE);
	const context = layer.getContext("2d");
	if (!context) return layer;
	const center = SPRITE_SIZE / 2;
	const falloff = context.createRadialGradient(
		center,
		center,
		0,
		center,
		center,
		center * extent,
	);
	for (let stop = 0; stop <= GAUSSIAN_STOPS; stop++) {
		const t = stop / GAUSSIAN_STOPS;
		const alpha = Math.exp(-((t * GAUSSIAN_SPREAD) ** 2)) * (1 - t);
		falloff.addColorStop(t, `rgb(0 0 0 / ${alpha})`);
	}
	context.fillStyle = falloff;
	context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
	context.globalCompositeOperation = "source-in";
	context.fillStyle = color;
	context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
	return layer;
};

export const paintSprite = ({ glow, core }: Palette) => {
	const sprite = new OffscreenCanvas(SPRITE_SIZE, SPRITE_SIZE);
	const context = sprite.getContext("2d");
	context?.drawImage(paintGaussian(glow, 1), 0, 0);
	context?.drawImage(paintGaussian(core, CORE_EXTENT), 0, 0);
	return sprite;
};

export const drawSwarm = (
	context: OffscreenCanvasRenderingContext2D,
	flies: Fly[],
	time: number,
	sprite: OffscreenCanvas,
	composite: GlobalCompositeOperation,
) => {
	context.clearRect(0, 0, context.canvas.width, context.canvas.height);
	context.globalCompositeOperation = composite;
	for (const fly of flies) {
		const radius = fly.size * GLOW_RADIUS_PER_SIZE;
		context.globalAlpha = brightness(fly, time);
		context.drawImage(
			sprite,
			fly.x - radius,
			fly.y - radius,
			radius * 2,
			radius * 2,
		);
	}
};
