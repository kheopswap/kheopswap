import {
	type BehaviorSubject,
	filter,
	firstValueFrom,
	map,
	timeout,
} from "rxjs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { getBalance$ } from "./service";
import { balancesState$ } from "./state";
import { addBalanceSubscription } from "./subscriptions";
import type { BalanceState } from "./types";
import { getBalanceId } from "./utils";

type GetValuesCall = { chainId: string; pallet: string; keys: unknown[][] };

const mocks = vi.hoisted(() => ({
	bestBlocks: new Map<string, unknown>(),
	nativeAccounts: new Map<string, { free: bigint; frozen: bigint }>(),
	hydrationAccounts: new Map<string, { free: bigint; frozen: bigint }>(),
	getValuesCalls: [] as GetValuesCall[],
	getApiChainIds: [] as string[],
	addedBalanceIds: [] as string[],
}));

vi.mock("./subscriptions", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./subscriptions")>();
	return {
		...actual,
		addBalanceSubscription: (balanceId: string) => {
			mocks.addedBalanceIds.push(balanceId);
			return actual.addBalanceSubscription(balanceId);
		},
	};
});

vi.mock("../../papi/getApi", async () => {
	const { BehaviorSubject } = await import("rxjs");

	const getBestBlock$ = (chainId: string) => {
		if (!mocks.bestBlocks.has(chainId))
			mocks.bestBlocks.set(chainId, new BehaviorSubject({ value: 1 }));
		return mocks.bestBlocks.get(chainId);
	};

	return {
		getApi: async (chainId: string) => {
			mocks.getApiChainIds.push(chainId);
			return {
				query: {
					System: {
						Number: { watchValue: () => getBestBlock$(chainId) },
						Account: {
							getValues: async (keys: [string][]) => {
								mocks.getValuesCalls.push({ chainId, pallet: "System", keys });
								return keys.map(([address]) => ({
									data: mocks.nativeAccounts.get(address) ?? {
										free: 0n,
										frozen: 0n,
									},
								}));
							},
						},
					},
					Tokens: {
						Accounts: {
							getValues: async (keys: [string, number][]) => {
								mocks.getValuesCalls.push({ chainId, pallet: "Tokens", keys });
								return keys.map(
									([address, assetId]) =>
										mocks.hydrationAccounts.get(`${assetId}||${address}`) ?? {
											free: 0n,
											frozen: 0n,
										},
								);
							},
						},
					},
				},
			};
		},
	};
});

const tickBestBlock = (chainId: string, block: number) =>
	(mocks.bestBlocks.get(chainId) as BehaviorSubject<{ value: number }>).next({
		value: block,
	});

const nativeCalls = (chainId: string) =>
	mocks.getValuesCalls.filter(
		(call) => call.chainId === chainId && call.pallet === "System",
	);

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

const settle = () => new Promise((resolve) => setTimeout(resolve, 250));

beforeAll(() => {
	if (!globalThis.crypto?.randomUUID) {
		Object.defineProperty(globalThis.crypto ?? {}, "randomUUID", {
			value: () =>
				`${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
		});
	}
});

describe("balances service pipeline", () => {
	it("reads every watched balance of a chain in one storage query per block", async () => {
		const addresses = [
			"5TestAddressAlice",
			"5TestAddressBob",
			"5TestAddressCarol",
		];
		mocks.nativeAccounts.set("5TestAddressAlice", { free: 100n, frozen: 10n });
		mocks.nativeAccounts.set("5TestAddressBob", { free: 50n, frozen: 0n });
		const balanceIds = addresses.map((address) =>
			getBalanceId({ address, tokenId: "native::pah" }),
		);
		const callsBefore = nativeCalls("pah").length;

		const unsubscribes = balanceIds.map(addBalanceSubscription);

		const [alice, bob, carol] = await Promise.all(
			balanceIds.map((balanceId) =>
				waitForBalanceState(balanceId, (s) => s?.status === "loaded"),
			),
		);
		expect(alice?.balance).toBe(90n);
		expect(bob?.balance).toBe(50n);
		expect(carol?.balance).toBe(0n);

		const firstBlockCalls = nativeCalls("pah").slice(callsBefore);
		expect(firstBlockCalls).toHaveLength(1);
		expect(firstBlockCalls[0]?.keys).toHaveLength(3);

		mocks.nativeAccounts.set("5TestAddressBob", { free: 75n, frozen: 5n });
		tickBestBlock("pah", 2);

		const bobAfter = await waitForBalanceState(
			balanceIds[1] as string,
			(s) => s?.balance === 70n,
		);
		expect(bobAfter?.status).toBe("loaded");
		expect(nativeCalls("pah").slice(callsBefore)).toHaveLength(2);

		for (const unsubscribe of unsubscribes) unsubscribe();
	});

	it("splits a chain's keys into storage queries of at most 250", async () => {
		const addresses = Array.from({ length: 251 }, (_, i) => `5Bulk${i}`);
		const balanceIds = addresses.map((address) =>
			getBalanceId({ address, tokenId: "native::wah" }),
		);
		const callsBefore = nativeCalls("wah").length;

		const unsubscribes = balanceIds.map(addBalanceSubscription);
		await waitForBalanceState(
			balanceIds[250] as string,
			(s) => s?.status === "loaded",
		);

		expect(
			nativeCalls("wah")
				.slice(callsBefore)
				.map((call) => call.keys.length),
		).toEqual([250, 1]);

		for (const unsubscribe of unsubscribes) unsubscribe();
	});

	it("stops reading a balance once nobody watches it but keeps it cached as stale", async () => {
		const address = "5TestAddressDave";
		mocks.nativeAccounts.set(address, { free: 100n, frozen: 10n });
		const balanceId = getBalanceId({ address, tokenId: "native::kah" });

		const unsubscribe = addBalanceSubscription(balanceId);
		const loaded = await waitForBalanceState(
			balanceId,
			(s) => s?.status === "loaded",
		);
		expect(loaded?.balance).toBe(90n);

		unsubscribe();
		const stale = await waitForBalanceState(
			balanceId,
			(s) => s?.status === "stale",
		);
		expect(stale?.balance).toBe(90n);

		const callsBefore = nativeCalls("kah").length;
		tickBestBlock("kah", 2);
		await settle();
		expect(nativeCalls("kah").slice(callsBefore)).toHaveLength(0);
	});

	it("watches System.Account on the people chain for its native token", async () => {
		const address = "5TestAddressEve";
		mocks.nativeAccounts.set(address, { free: 100n, frozen: 10n });
		const balanceId = getBalanceId({ address, tokenId: "native::ppeople" });
		const getApiCallsBefore = mocks.getApiChainIds.length;

		const unsubscribe = addBalanceSubscription(balanceId);

		const loaded = await waitForBalanceState(
			balanceId,
			(s) => s?.status === "loaded",
		);
		expect(loaded?.balance).toBe(90n);
		expect(new Set(mocks.getApiChainIds.slice(getApiCallsBefore))).toEqual(
			new Set(["ppeople"]),
		);

		unsubscribe();
	});

	it("deducts frozen from free for hydration asset balances", async () => {
		const address = "5TestAddressCharlie";
		mocks.hydrationAccounts.set(`5||${address}`, { free: 100n, frozen: 10n });
		const balanceId = getBalanceId({
			address,
			tokenId: "hydration-asset::hydration::5",
		});

		const unsubscribe = addBalanceSubscription(balanceId);

		const loaded = await waitForBalanceState(
			balanceId,
			(s) => s?.status === "loaded",
		);
		expect(loaded?.balance).toBe(90n);

		unsubscribe();
	});
});

describe("getBalance$ for an Ethereum account outside Asset Hub", () => {
	it.each([
		"native::hydration",
		"hydration-asset::hydration::5",
		"native::ppeople",
	])(
		"reports %s as loaded without balance and never watches it",
		async (tokenId) => {
			const address = `0x${"ab".repeat(20)}` as const;
			const getApiCallsBefore = mocks.getApiChainIds.length;

			const state = await firstValueFrom(
				getBalance$({ address, tokenId }).pipe(timeout(1_000)),
			);
			expect(state).toEqual({ status: "loaded", balance: undefined });

			await settle();

			expect(mocks.getApiChainIds.slice(getApiCallsBefore)).toEqual([]);
			expect(
				mocks.addedBalanceIds.filter((id) => id.includes(address)),
			).toEqual([]);
		},
	);
});
