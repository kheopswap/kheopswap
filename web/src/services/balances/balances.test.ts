import {
	type BehaviorSubject,
	filter,
	firstValueFrom,
	map,
	timeout,
} from "rxjs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { getLocalStorageKey } from "../../utils/getLocalStorageKey";
import { discoverBalances } from "./discovery";
import { getBalance$, heldTokenIds$ } from "./service";
import { balancesState$ } from "./state";
import { balancesStore$ } from "./store";
import { addBalanceSubscription } from "./subscriptions";
import type { BalanceState } from "./types";
import { getBalanceId } from "./utils";

type GetValuesCall = { chainId: string; pallet: string; keys: unknown[][] };

const mocks = vi.hoisted(() => ({
	bestBlocks: new Map<string, unknown>(),
	nativeAccounts: new Map<
		string,
		{ free: bigint; reserved?: bigint; frozen: bigint }
	>(),
	hydrationAccounts: new Map<string, { free: bigint; frozen: bigint }>(),
	assetAccounts: new Map<string, { balance: bigint }>(),
	failingPallets: new Set<string>(),
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
		const current = mocks.bestBlocks.get(chainId) as
			| BehaviorSubject<{ value: number }>
			| undefined;
		if (!current || current.hasError)
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
									data: {
										free: 0n,
										reserved: 0n,
										frozen: 0n,
										...mocks.nativeAccounts.get(address),
									},
								}));
							},
						},
					},
					Assets: {
						Account: {
							getValues: async (keys: [number, string][]) => {
								mocks.getValuesCalls.push({ chainId, pallet: "Assets", keys });
								if (mocks.failingPallets.has("Assets"))
									throw new Error("Assets pallet unavailable");
								return keys.map(([assetId, address]) => {
									const account = mocks.assetAccounts.get(
										`${assetId}||${address}`,
									);
									return account
										? { status: { type: "Liquid" }, balance: account.balance }
										: undefined;
								});
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
		expect(alice).toMatchObject({ balance: 90n, frozen: 10n });
		expect(bob).toMatchObject({ balance: 50n, frozen: 0n });
		expect(carol).toMatchObject({ balance: 0n, frozen: 0n });

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
		mocks.nativeAccounts.set("5Bulk249", { free: 249n, frozen: 0n });
		mocks.nativeAccounts.set("5Bulk250", { free: 250n, frozen: 0n });
		const balanceIds = addresses.map((address) =>
			getBalanceId({ address, tokenId: "native::wah" }),
		);
		const callsBefore = nativeCalls("wah").length;

		const unsubscribes = balanceIds.map(addBalanceSubscription);
		const last = await waitForBalanceState(
			balanceIds[250] as string,
			(s) => s?.status === "loaded",
		);
		const beforeBoundary = await waitForBalanceState(
			balanceIds[249] as string,
			(s) => s?.status === "loaded",
		);

		expect(
			nativeCalls("wah")
				.slice(callsBefore)
				.map((call) => call.keys.length),
		).toEqual([250, 1]);
		expect(beforeBoundary?.balance).toBe(249n);
		expect(last?.balance).toBe(250n);

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

	it("keeps reading after the best block stream errors", async () => {
		const address = "5TestAddressFrank";
		mocks.nativeAccounts.set(address, { free: 10n, frozen: 0n });
		const balanceId = getBalanceId({ address, tokenId: "native::kah" });
		const unsubscribe = addBalanceSubscription(balanceId);
		await waitForBalanceState(balanceId, (s) => s?.balance === 10n);

		(mocks.bestBlocks.get("kah") as BehaviorSubject<{ value: number }>).error(
			new Error("subscription dropped"),
		);
		await settle();
		mocks.nativeAccounts.set(address, { free: 20n, frozen: 0n });
		await new Promise((resolve) => setTimeout(resolve, 1_100));
		tickBestBlock("kah", 3);

		const recovered = await waitForBalanceState(
			balanceId,
			(s) => s?.balance === 20n,
		);
		expect(recovered?.status).toBe("loaded");

		unsubscribe();
	});

	it("does not re-read a chain whose watched entries did not change", async () => {
		const pahId = getBalanceId({
			address: "5TestAddressGrace",
			tokenId: "native::pah",
		});
		const unsubscribePah = addBalanceSubscription(pahId);
		await waitForBalanceState(pahId, (s) => s?.status === "loaded");
		const pahCallsBefore = nativeCalls("pah").length;

		const wahId = getBalanceId({
			address: "5TestAddressHeidi",
			tokenId: "native::wah",
		});
		const unsubscribeWah = addBalanceSubscription(wahId);
		await waitForBalanceState(wahId, (s) => s?.status === "loaded");
		await settle();

		expect(nativeCalls("pah").length).toBe(pahCallsBefore);

		unsubscribePah();
		unsubscribeWah();
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

	it.each([
		{ free: 50n, reserved: 1_000n, frozen: 1_000n, balance: 50n, locked: 0n },
		{ free: 100n, reserved: 30n, frozen: 50n, balance: 80n, locked: 20n },
		{ free: 10n, reserved: 0n, frozen: 30n, balance: 0n, locked: 30n },
	])(
		"lets a native freeze cover reserved funds first (free $free, reserved $reserved, frozen $frozen)",
		async ({ free, reserved, frozen, balance, locked }) => {
			const address = `5TestAddressNative${free}-${reserved}-${frozen}`;
			mocks.nativeAccounts.set(address, { free, reserved, frozen });
			const balanceId = getBalanceId({ address, tokenId: "native::pah" });

			const unsubscribe = addBalanceSubscription(balanceId);

			await waitForBalanceState(balanceId, (s) => s?.status === "loaded");
			expect(balancesStore$.value[balanceId]).toMatchObject({
				balance,
				frozen: locked,
			});

			unsubscribe();
		},
	);

	it("reports a zero balance it never stored as loaded at zero without storing it", async () => {
		const address = "5TestAddressEmpty";
		const balanceId = getBalanceId({ address, tokenId: "native::pah" });

		const unsubscribe = addBalanceSubscription(balanceId);

		const loaded = await waitForBalanceState(
			balanceId,
			(s) => s?.status === "loaded",
		);
		expect(loaded).toMatchObject({ balance: 0n, frozen: 0n });
		expect(balancesStore$.value[balanceId]).toBeUndefined();

		unsubscribe();
	});

	it("keeps storing a balance that drops to zero", async () => {
		const address = "5TestAddressSpender";
		mocks.nativeAccounts.set(address, { free: 10n, frozen: 0n });
		const balanceId = getBalanceId({ address, tokenId: "native::kah" });

		const unsubscribe = addBalanceSubscription(balanceId);
		await waitForBalanceState(balanceId, (s) => s?.balance === 10n);

		mocks.nativeAccounts.set(address, { free: 0n, frozen: 0n });
		tickBestBlock("kah", 2);

		await waitForBalanceState(balanceId, (s) => s?.balance === 0n);
		expect(balancesStore$.value[balanceId]?.balance).toBe(0n);

		unsubscribe();
	});

	it("counts a fully frozen hydration asset as held", async () => {
		const address = "5TestAddressFrozen";
		mocks.hydrationAccounts.set(`9||${address}`, { free: 100n, frozen: 100n });
		const balanceId = getBalanceId({
			address,
			tokenId: "hydration-asset::hydration::9",
		});

		const unsubscribe = addBalanceSubscription(balanceId);
		await waitForBalanceState(balanceId, (s) => s?.frozen === 100n);

		expect(await firstValueFrom(heldTokenIds$)).toContain(
			"hydration-asset::hydration::9",
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

describe("discoverBalances", () => {
	it("stores a token received by an unwatched account without subscribing to it", async () => {
		const address = "5TestAddressIvan";
		mocks.assetAccounts.set(`1984||${address}`, { balance: 5n });
		const receivedId = getBalanceId({ address, tokenId: "asset::pah::1984" });
		const emptyId = getBalanceId({ address, tokenId: "asset::pah::1337" });

		await discoverBalances([
			{ address, tokenId: "asset::pah::1984" },
			{ address, tokenId: "asset::pah::1337" },
		]);

		expect(balancesStore$.value[receivedId]?.balance).toBe(5n);
		expect(balancesStore$.value[emptyId]).toBeUndefined();
		expect(
			localStorage.getItem(getLocalStorageKey("balances::v3")) ?? "",
		).toContain(`"address":"${address}","tokenId":"asset::pah::1984"`);
		expect(await firstValueFrom(heldTokenIds$)).toContain("asset::pah::1984");
		expect(mocks.addedBalanceIds).not.toContain(receivedId);
	});

	it("finishes when a pallet read fails and keeps what the other pallets returned", async () => {
		const address = "5TestAddressJudy";
		mocks.nativeAccounts.set(address, { free: 3n, frozen: 0n });
		mocks.failingPallets.add("Assets");
		const nativeId = getBalanceId({ address, tokenId: "native::pah" });

		await expect(
			discoverBalances([
				{ address, tokenId: "native::pah" },
				{ address, tokenId: "asset::pah::1984" },
			]),
		).resolves.toBeUndefined();

		expect(balancesStore$.value[nativeId]?.balance).toBe(3n);
		mocks.failingPallets.delete("Assets");
	});

	it("skips chains an Ethereum account cannot hold balances on", async () => {
		const getApiCallsBefore = mocks.getApiChainIds.length;
		await discoverBalances([
			{ address: `0x${"cd".repeat(20)}`, tokenId: "native::hydration" },
		]);
		expect(mocks.getApiChainIds.slice(getApiCallsBefore)).toEqual([]);
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
