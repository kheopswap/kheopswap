import {
	advanceFly,
	type Bounds,
	createFly,
	drawSwarm,
	type Fly,
	type Palette,
	type Point,
	paintSprite,
} from "./fireflySwarm";

const FLY_COUNT = 30;
const FRAME_DELAY_MS = 30;
const MAX_STEP_SECONDS = 0.05;
const POINTER_IDLE_MS = 2500;

export type FirefliesMessage =
	| { type: "start"; canvas: OffscreenCanvas; bounds: Bounds; palette: Palette }
	| { type: "resize"; bounds: Bounds }
	| { type: "palette"; palette: Palette }
	| { type: "pointer"; pointer: Point };

type Swarm = {
	context: OffscreenCanvasRenderingContext2D;
	flies: Fly[];
	bounds: Bounds;
	sprite: OffscreenCanvas;
	composite: GlobalCompositeOperation;
	pointer?: Point & { movedAt: number };
	time: number;
	last: number;
};

let swarm: Swarm | undefined;

const resize = (current: Swarm, bounds: Bounds) => {
	current.bounds = bounds;
	current.context.canvas.width = bounds.width;
	current.context.canvas.height = bounds.height;
};

const render = (now: number) => {
	if (!swarm) return;
	const step = Math.min(MAX_STEP_SECONDS, (now - swarm.last) / 1000);
	swarm.last = now;
	swarm.time += step;
	const pull =
		swarm.pointer && now - swarm.pointer.movedAt < POINTER_IDLE_MS
			? swarm.pointer
			: undefined;
	for (const fly of swarm.flies)
		advanceFly(fly, swarm.time, step, swarm.bounds, pull);
	drawSwarm(
		swarm.context,
		swarm.flies,
		swarm.time,
		swarm.sprite,
		swarm.composite,
	);
	setTimeout(() => requestAnimationFrame(render), FRAME_DELAY_MS);
};

const start = (canvas: OffscreenCanvas, bounds: Bounds, palette: Palette) => {
	const context = canvas.getContext("2d");
	if (!context) return;
	swarm = {
		context,
		flies: Array.from({ length: FLY_COUNT }, () => createFly(bounds)),
		bounds,
		sprite: paintSprite(palette),
		composite: palette.composite,
		time: 0,
		last: performance.now(),
	};
	resize(swarm, bounds);
	requestAnimationFrame(render);
};

addEventListener("message", ({ data }: MessageEvent<FirefliesMessage>) => {
	if (data.type === "start")
		return start(data.canvas, data.bounds, data.palette);
	if (!swarm) return;
	switch (data.type) {
		case "resize":
			return resize(swarm, data.bounds);
		case "palette":
			swarm.sprite = paintSprite(data.palette);
			swarm.composite = data.palette.composite;
			return;
		case "pointer":
			swarm.pointer = { ...data.pointer, movedAt: performance.now() };
			return;
	}
});
