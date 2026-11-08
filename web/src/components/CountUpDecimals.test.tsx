import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CountUpDecimals } from "./CountUpDecimals";

let frames: FrameRequestCallback[] = [];

const runFrameAt = (timestamp: number) => {
	const pending = frames;
	frames = [];
	for (const frame of pending) frame(timestamp);
};

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
	cleanup();
	vi.unstubAllGlobals();
});

describe("CountUpDecimals", () => {
	it("shows the first value without animating", () => {
		const { container } = render(<CountUpDecimals value={1000} />);

		expect(container.textContent).toBe("1K");
		expect(frames).toHaveLength(0);
	});

	it("animates a later value from the displayed one", () => {
		const { container, rerender } = render(<CountUpDecimals value={1000} />);

		rerender(<CountUpDecimals value={2000} />);

		const shown: string[] = [];
		for (const timestamp of [1000, 1300, 2100]) {
			runFrameAt(timestamp);
			shown.push(container.textContent ?? "");
		}

		expect(shown[0]).toBe("1K");
		expect(shown[1]).not.toMatch(/^[12]K$/);
		expect(shown[2]).toBe("2K");
	});
});
