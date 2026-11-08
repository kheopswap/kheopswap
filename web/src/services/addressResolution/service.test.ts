import type { SS58String } from "polkadot-api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getResolvedSubstrateAddress$ } from "./service";

const mocks = vi.hoisted(() => ({
	getValue: vi.fn<() => Promise<SS58String | undefined>>(),
}));

vi.mock("../../papi/getApi", () => ({
	getApi: async () => ({
		query: { Revive: { OriginalAccount: { getValue: mocks.getValue } } },
	}),
}));

const POLL_INTERVAL = 30_000;
const MAPPED = "5MappedSubstrateAddress" as SS58String;

const subscribeTo = (address: string) => {
	const states: { address: SS58String | undefined; status: string }[] = [];
	const subscription = getResolvedSubstrateAddress$({
		address,
		chainId: "pah",
	}).subscribe((state) => states.push(state));
	return { states, subscription };
};

describe("getResolvedSubstrateAddress$", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mocks.getValue.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("resolves at the next poll after a failed first read", async () => {
		mocks.getValue
			.mockRejectedValueOnce(new Error("Revive storage unavailable"))
			.mockResolvedValue(MAPPED);
		const { states, subscription } = subscribeTo(`0x${"11".repeat(20)}`);

		await vi.advanceTimersByTimeAsync(POLL_INTERVAL);

		expect(states.at(-1)).toEqual({ address: MAPPED, status: "loaded" });
		expect(mocks.getValue).toHaveBeenCalledTimes(2);

		subscription.unsubscribe();
	});

	it("keeps the resolved address when a later poll fails", async () => {
		mocks.getValue
			.mockResolvedValueOnce(MAPPED)
			.mockRejectedValueOnce(new Error("Revive storage unavailable"))
			.mockResolvedValue(MAPPED);
		const { states, subscription } = subscribeTo(`0x${"22".repeat(20)}`);

		await vi.advanceTimersByTimeAsync(2 * POLL_INTERVAL);

		expect(states).toEqual([
			{ address: undefined, status: "loading" },
			{ address: MAPPED, status: "loaded" },
		]);
		expect(mocks.getValue).toHaveBeenCalledTimes(3);

		subscription.unsubscribe();
	});
});
