import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COUNT_UP_DURATION_MS, useCountUp } from "./useCountUp";

describe("useCountUp", () => {
	beforeEach(() => {
		vi.useFakeTimers({
			toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"],
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

	it("counts up from zero to the value", () => {
		const { result } = renderHook(() => useCountUp(1000));
		expect(result.current).toBe(0);

		advance(COUNT_UP_DURATION_MS / 2);
		expect(result.current).toBeGreaterThan(0);
		expect(result.current).toBeLessThan(1000);

		advance(COUNT_UP_DURATION_MS);
		expect(result.current).toBe(1000);
	});

	it("animates from the displayed value when the value changes", () => {
		const { result, rerender } = renderHook(({ value }) => useCountUp(value), {
			initialProps: { value: 1000 },
		});
		advance(COUNT_UP_DURATION_MS * 2);

		rerender({ value: 1500 });
		advance(COUNT_UP_DURATION_MS / 10);
		expect(result.current).toBeGreaterThan(1000);
		expect(result.current).toBeLessThan(1500);

		advance(COUNT_UP_DURATION_MS * 2);
		expect(result.current).toBe(1500);
	});
});
