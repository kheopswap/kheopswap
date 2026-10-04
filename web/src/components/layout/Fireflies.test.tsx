import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Fireflies } from "./Fireflies";

const reducedMotion = Object.assign(new EventTarget(), { matches: false });

const setReducedMotion = (matches: boolean) => {
	reducedMotion.matches = matches;
	reducedMotion.dispatchEvent(new Event("change"));
};

const firstFly = () => {
	const fly = document.querySelector<HTMLElement>(".firefly");
	if (!fly) throw new Error("no firefly rendered");
	return fly;
};

const movePointerRightOf = (fly: HTMLElement, offset: number) => {
	const x = (Number.parseFloat(fly.style.left) / 100) * innerWidth + offset;
	const y = (Number.parseFloat(fly.style.top) / 100) * innerHeight;
	window.dispatchEvent(
		new MouseEvent("pointermove", { clientX: x, clientY: y }),
	);
	vi.advanceTimersByTime(200);
};

describe("Fireflies", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		reducedMotion.matches = false;
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => reducedMotion),
		);
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("pulls a nearby fly toward the pointer and releases it once the pointer rests", () => {
		render(<Fireflies />);
		const fly = firstFly();

		movePointerRightOf(fly, 100);
		expect(fly.style.transform).toBe("translate(40px, 0px)");

		vi.advanceTimersByTime(2500);
		expect(fly.style.transform).toBe("");
	});

	it("ignores the pointer while reduced motion is requested", () => {
		reducedMotion.matches = true;
		render(<Fireflies />);
		const fly = firstFly();

		movePointerRightOf(fly, 100);
		expect(fly.style.transform).toBe("");

		setReducedMotion(false);
		movePointerRightOf(fly, 100);
		expect(fly.style.transform).toBe("translate(40px, 0px)");

		setReducedMotion(true);
		expect(fly.style.transform).toBe("");
		movePointerRightOf(fly, 100);
		expect(fly.style.transform).toBe("");
	});
});
