import { act, cleanup, render, renderHook } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { BehaviorSubject } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindSerialized } from "./bindSerialized";

const createBinding = () => {
	const source$ = new BehaviorSubject("loaded");
	const getDefaultValue = vi.fn((id: string) => `default:${id}`);
	const useValue = bindSerialized((_id: string) => source$, getDefaultValue);
	return { useValue, getDefaultValue };
};

class SwallowErrors extends Component<{ children: ReactNode }> {
	state = { failed: false };
	static getDerivedStateFromError = () => ({ failed: true });
	render = () => (this.state.failed ? null : this.props.children);
}

const Throw = () => {
	throw new Error("abandon render");
};

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("bindSerialized", () => {
	it("returns the source value once subscribed", () => {
		const { useValue } = createBinding();

		const { result } = renderHook(() => useValue("a"));

		expect(result.current).toBe("loaded");
	});

	it("shares one entry per serialized key while subscribed", () => {
		const { useValue, getDefaultValue } = createBinding();

		renderHook(() => useValue("a"));
		renderHook(() => useValue("a"));
		act(() => vi.advanceTimersByTime(1000));
		renderHook(() => useValue("a"));

		expect(getDefaultValue).toHaveBeenCalledTimes(1);
	});

	it("evicts entries once they have no subscribers", () => {
		const { useValue, getDefaultValue } = createBinding();

		const { unmount } = renderHook(() => useValue("a"));
		unmount();
		act(() => vi.advanceTimersByTime(1000));
		renderHook(() => useValue("a"));

		expect(getDefaultValue).toHaveBeenCalledTimes(2);
	});

	it("evicts entries created by renders that never commit", () => {
		const { useValue, getDefaultValue } = createBinding();
		const Consumer = ({ id }: { id: string }) => <>{useValue(id)}</>;

		vi.spyOn(console, "error").mockImplementation(() => {});
		render(
			<SwallowErrors>
				<Consumer id="a" />
				<Throw />
			</SwallowErrors>,
		);
		act(() => vi.advanceTimersByTime(1000));
		renderHook(() => useValue("a"));

		expect(getDefaultValue).toHaveBeenCalledTimes(2);
	});
});
