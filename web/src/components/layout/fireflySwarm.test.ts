import { describe, expect, it } from "vitest";
import { advanceFly, type Bounds, type Fly } from "./fireflySwarm";

const bounds: Bounds = { width: 1000, height: 1000, pixelRatio: 1 };

const flyAt = (x: number, y: number): Fly => ({
	x,
	y,
	vx: 0,
	vy: 0,
	size: 2,
	seed: 42,
	blinkPhase: 0,
	blinkRate: 1,
});

const drift = (pointer?: { x: number; y: number }) => {
	const fly = flyAt(500, 500);
	for (let frame = 0; frame < 30; frame++)
		advanceFly(fly, frame / 30, 1 / 30, bounds, pointer);
	return fly;
};

describe("advanceFly", () => {
	it("draws a fly toward a pointer within reach", () => {
		const free = drift();
		const pulled = drift({ x: 700, y: 500 });
		expect(pulled.x - free.x).toBeGreaterThan(5);
		expect(pulled.y).toBeCloseTo(free.y);
	});

	it("ignores a pointer that is too close or too far", () => {
		const free = drift();
		expect(drift({ x: 520, y: 500 })).toEqual(free);
		expect(drift({ x: 900, y: 500 })).toEqual(free);
	});

	it("wraps a fly leaving one edge to the opposite edge", () => {
		const fly = { ...flyAt(999, 500), vx: 200 };
		advanceFly(fly, 0, 1 / 30, bounds);
		expect(fly.x).toBeLessThan(10);
	});
});
