import { filter, firstValueFrom, map, type Subject, timeout } from "rxjs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { balancesState$ } from "./state";
import {
	addBalanceSubscription,
	removeBalancesSubscription,
} from "./subscriptions";
import type { BalanceState } from "./types";
import { getBalanceId } from "./utils";

type AccountValue = { value: { data: { free: bigint; frozen: bigint } } };

const mocks = vi.hoisted(() => ({
	accountSubjects: new Map<string, unknown>(),
	watchValueCalls: [] as string[],
}));

vi.mock("../../papi/getApi", async () => {
	const { Subject } = await import("rxjs");

	const getAccountObservable = (key: string) => {
		mocks.watchValueCalls.push(key);
		if (!mocks.accountSubjects.has(key))
			mocks.accountSubjects.set(key, new Subject());
		return mocks.accountSubjects.get(key);
	};

	return {
		getApi: async () => ({
			query: {
				System: {
					Account: {
						watchValue: (address: string) =>
							getAccountObservable(`native||${address}`),
					},
				},
			},
		}),
	};
});

const getSubject = (key: string) =>
	mocks.accountSubjects.get(key) as Subject<AccountValue>;

const waitForBalanceState = (
	balanceId: string,
	predicate: (state: BalanceState | undefined) => boolean,
) =>
	firstValueFrom(
		balancesState$.pipe(
			map((state) => state[balanceId]),
			filter(predicate),
			timeout(3_000),
		),
	);

beforeAll(() => {
	// jsdom may not provide crypto.randomUUID, which subscriptions rely on
	if (!globalThis.crypto?.randomUUID) {
		Object.defineProperty(globalThis.crypto ?? {}, "randomUUID", {
			value: () =>
				`${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
		});
	}
});

describe("balances service pipeline", () => {
	it("watches, stores, and derives balance state through the full pipeline", async () => {
		const address = "5TestAddressAlice";
		const balanceId = getBalanceId({ address, tokenId: "native::pah" });
		const subjectKey = `native||${address}`;

		const subId = addBalanceSubscription(balanceId);

		// the watcher opens asynchronously (subscription list debounce + getApi)
		await vi.waitFor(() =>
			expect(mocks.accountSubjects.has(subjectKey)).toBe(true),
		);

		// chain emits an account value -> free - frozen lands in the state
		getSubject(subjectKey).next({
			value: { data: { free: 100n, frozen: 10n } },
		});

		const loaded = await waitForBalanceState(
			balanceId,
			(s) => s?.status === "loaded",
		);
		expect(loaded?.balance).toBe(90n);

		// removing the subscription stops the watcher...
		removeBalancesSubscription(subId);
		await vi.waitFor(() => expect(getSubject(subjectKey).observed).toBe(false));

		// ...but keeps the cached balance, downgraded to "stale"
		const stale = await waitForBalanceState(
			balanceId,
			(s) => s?.status === "stale",
		);
		expect(stale?.balance).toBe(90n);
	});

	it("opens a single watcher for duplicate subscriptions", async () => {
		const address = "5TestAddressBob";
		const balanceId = getBalanceId({ address, tokenId: "native::pah" });
		const subjectKey = `native||${address}`;

		addBalanceSubscription(balanceId);
		addBalanceSubscription(balanceId);

		await vi.waitFor(() =>
			expect(mocks.accountSubjects.has(subjectKey)).toBe(true),
		);
		// give the debounced subscription list time to settle
		await new Promise((resolve) => setTimeout(resolve, 250));

		expect(
			mocks.watchValueCalls.filter((key) => key === subjectKey),
		).toHaveLength(1);
	});
});
