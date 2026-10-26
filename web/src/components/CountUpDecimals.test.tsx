import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CountUpDecimals } from "./CountUpDecimals";

let frames: FrameRequestCallback[] = [];

const runFrameAt = (timestamp: number) => {
	const pending = frames;
	frames = [];
	for (const frame of pending) frame(timestamp);
};

const parse = (text: string | null) => Number(text?.replaceAll(",", ""));

beforeEach(() => {
	frames = [];
	vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
		frames.push(frame);
		return frames.length;
	});
	vi.stubGlobal("cancelAnimationFrame", () => {
		frames = [];
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("CountUpDecimals", () => {
	it("prints the first value as it is, without animating", () => {
		const { container } = render(<CountUpDecimals value={10196.95} />);

		expect(container.textContent).toBe("10,196.95");
		expect(frames).toHaveLength(0);
	});

	it("animates an update from the displayed value without dropping below it", () => {
		const { container, rerender } = render(
			<CountUpDecimals value={10196.95} />,
		);

		rerender(<CountUpDecimals value={10300} />);

		const shown: number[] = [];
		for (const timestamp of [0, 100, 400, 700, 1000, 1100]) {
			runFrameAt(timestamp);
			shown.push(parse(container.textContent));
		}

		expect(shown[0]).toBe(10196.95);
		expect(shown).toEqual([...shown].sort((a, b) => a - b));
		expect(container.textContent).toBe("10,300.00");
	});

	it("keeps a tiny positive total visible as a lower bound", () => {
		const { container, rerender } = render(<CountUpDecimals value={1e-12} />);
		expect(container.textContent).toBe("< 0.01");

		rerender(<CountUpDecimals value={2e-12} />);
		for (const timestamp of [0, 500, 1100]) runFrameAt(timestamp);

		expect(container.textContent).toBe("< 0.01");
	});
});
