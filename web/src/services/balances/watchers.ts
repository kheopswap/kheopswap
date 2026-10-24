import { chunk, groupBy, isEqual } from "lodash-es";
import type { SS58String } from "polkadot-api";
import {
	BehaviorSubject,
	combineLatest,
	from,
	map,
	type Observable,
	retry,
	type Subscription,
	shareReplay,
	switchMap,
	timer,
} from "rxjs";
import { getApi } from "../../papi/getApi";
import type { ChainId } from "../../registry/chains/types";
import { parseTokenId } from "../../registry/tokens/helpers";
import type { XcmV5Multilocation } from "../../registry/types/xcm";
import { getCachedObservable$ } from "../../utils/getCachedObservable";
import { logger } from "../../utils/logger";
import type { LoadingStatus } from "../common";
import { balancesStore$ } from "./store";
import { balanceSubscriptions$ } from "./subscriptions";
import type { Address, BalanceId } from "./types";
import { parseBalanceId } from "./utils";

type ParsedToken = ReturnType<typeof parseTokenId>;

type BalanceEntry<T extends ParsedToken = ParsedToken> = {
	balanceId: BalanceId;
	address: Address;
	token: T;
};

type BalanceValue = { balance: bigint; frozen: bigint };

type BalanceUpdate = [BalanceId, BalanceValue];

const statusByBalanceId$ = new BehaviorSubject<Record<string, LoadingStatus>>(
	{},
);

const toEntry = (balanceId: BalanceId): BalanceEntry => {
	const { address, tokenId } = parseBalanceId(balanceId);
	return { balanceId, address, token: parseTokenId(tokenId) };
};

const ofType = <T extends ParsedToken["type"]>(
	entries: BalanceEntry[],
	type: T,
) =>
	entries.filter(
		(entry): entry is BalanceEntry<Extract<ParsedToken, { type: T }>> =>
			entry.token.type === type,
	);

const liquidBalance = (
	account: { status: { type: string }; balance: bigint } | undefined,
): BalanceValue => ({
	balance: account?.status.type === "Liquid" ? account.balance : 0n,
	frozen: 0n,
});

const spendableBalance = ({
	free,
	frozen,
}: {
	free: bigint;
	frozen: bigint;
}): BalanceValue => ({ balance: free - frozen, frozen });

const KEYS_PER_STORAGE_QUERY = 250;

const getValuesInChunks = async <K, V>(
	keys: K[],
	getValues: (keys: K[]) => Promise<V[]>,
) =>
	(
		await Promise.all(chunk(keys, KEYS_PER_STORAGE_QUERY).map(getValues))
	).flat();

const zip = <T>(
	entries: BalanceEntry[],
	values: T[],
	getBalance: (value: T) => BalanceValue,
): BalanceUpdate[] =>
	entries.map((entry, i) => [entry.balanceId, getBalance(values[i] as T)]);

const readNativeBalances = async (
	entries: BalanceEntry<{ type: "native"; chainId: ChainId }>[],
) => {
	const [first] = entries;
	if (!first) return [];
	const api = await getApi(first.token.chainId);
	const accounts = await getValuesInChunks(
		entries.map((entry): [SS58String] => [entry.address]),
		(keys) => api.query.System.Account.getValues(keys, { at: "best" }),
	);
	return zip(entries, accounts, (account) => spendableBalance(account.data));
};

const readAssetBalances = async (
	entries: BalanceEntry<Extract<ParsedToken, { type: "asset" }>>[],
) => {
	const [first] = entries;
	if (!first) return [];
	const api = await getApi(first.token.chainId);
	const accounts = await getValuesInChunks(
		entries.map((entry): [number, SS58String] => [
			entry.token.assetId,
			entry.address,
		]),
		(keys) => api.query.Assets.Account.getValues(keys, { at: "best" }),
	);
	return zip(entries, accounts, liquidBalance);
};

const readPoolAssetBalances = async (
	entries: BalanceEntry<Extract<ParsedToken, { type: "pool-asset" }>>[],
) => {
	const [first] = entries;
	if (!first) return [];
	const api = await getApi(first.token.chainId);
	const accounts = await getValuesInChunks(
		entries.map((entry): [number, SS58String] => [
			entry.token.poolAssetId,
			entry.address,
		]),
		(keys) => api.query.PoolAssets.Account.getValues(keys, { at: "best" }),
	);
	return zip(entries, accounts, liquidBalance);
};

const readForeignAssetBalances = async (
	entries: BalanceEntry<Extract<ParsedToken, { type: "foreign-asset" }>>[],
) => {
	const [first] = entries;
	if (!first) return [];
	const api = await getApi(first.token.chainId);
	const accounts = await getValuesInChunks(
		entries.map((entry): [XcmV5Multilocation, SS58String] => [
			entry.token.location,
			entry.address,
		]),
		(keys) => api.query.ForeignAssets.Account.getValues(keys, { at: "best" }),
	);
	return zip(entries, accounts, liquidBalance);
};

const readHydrationAssetBalances = async (
	entries: BalanceEntry<Extract<ParsedToken, { type: "hydration-asset" }>>[],
) => {
	const [first] = entries;
	if (!first) return [];
	const api = await getApi(first.token.chainId);
	const accounts = await getValuesInChunks(
		entries.map((entry): [SS58String, number] => [
			entry.address,
			entry.token.assetId,
		]),
		(keys) => api.query.Tokens.Accounts.getValues(keys, { at: "best" }),
	);
	return zip(entries, accounts, spendableBalance);
};

const readChainBalances = (entries: BalanceEntry[]) =>
	Promise.all(
		[
			readNativeBalances(ofType(entries, "native")),
			readAssetBalances(ofType(entries, "asset")),
			readPoolAssetBalances(ofType(entries, "pool-asset")),
			readForeignAssetBalances(ofType(entries, "foreign-asset")),
			readHydrationAssetBalances(ofType(entries, "hydration-asset")),
		].map((read) =>
			read.catch((err): BalanceUpdate[] => {
				logger.error("Failed to read balances", { err });
				return [];
			}),
		),
	).then((updates) => updates.flat());

const BLOCK_STREAM_RETRY_DELAY = 1_000;

const getBestBlockNumber$ = (chainId: ChainId): Observable<number> =>
	getCachedObservable$("getBestBlockNumber$", chainId, () =>
		from(getApi(chainId)).pipe(
			switchMap((api) => api.query.System.Number.watchValue({ at: "best" })),
			map(({ value }) => value),
			retry({
				delay: (err) => {
					logger.error("Best block stream failed, retrying", { chainId, err });
					return timer(BLOCK_STREAM_RETRY_DELAY);
				},
			}),
			shareReplay({ bufferSize: 1, refCount: true }),
		),
	);

const groupEntriesByChain = (balanceIds: BalanceId[]) =>
	new Map(
		Object.entries(
			groupBy(balanceIds.map(toEntry), (entry) => entry.token.chainId),
		) as [ChainId, BalanceEntry[]][],
	);

const applyUpdates = (updates: BalanceUpdate[]) => {
	if (!updates.length) return;

	const store = balancesStore$.value;
	const changed = updates.filter(
		([balanceId, { balance, frozen }]) =>
			store[balanceId]?.balance !== balance ||
			store[balanceId]?.frozen !== frozen,
	);
	if (changed.length)
		balancesStore$.next({
			...store,
			...Object.fromEntries(
				changed.map(([balanceId, { balance, frozen }]) => [
					balanceId,
					{ ...parseBalanceId(balanceId), balance, frozen },
				]),
			),
		});

	const statuses = statusByBalanceId$.value;
	const loaded = updates.filter(
		([balanceId]) => balanceId in statuses && statuses[balanceId] !== "loaded",
	);
	if (loaded.length)
		statusByBalanceId$.next({
			...statuses,
			...Object.fromEntries(loaded.map(([balanceId]) => [balanceId, "loaded"])),
		});
};

type ChainWatcher = {
	entries$: BehaviorSubject<BalanceEntry[]>;
	stop: () => void;
};

const watchChainBalances = (
	chainId: ChainId,
	entries: BalanceEntry[],
): ChainWatcher => {
	const entries$ = new BehaviorSubject(entries);
	let reading = false;
	let pending: BalanceEntry[] | null = null;
	let stopped = false;

	const read = async (entries: BalanceEntry[]) => {
		if (reading) {
			pending = entries;
			return;
		}
		reading = true;
		try {
			const updates = await readChainBalances(entries);
			if (!stopped) applyUpdates(updates);
		} finally {
			reading = false;
			if (pending && !stopped) {
				const next = pending;
				pending = null;
				read(next);
			}
		}
	};

	const subscription: Subscription = combineLatest([
		getBestBlockNumber$(chainId),
		entries$,
	]).subscribe({
		next: ([, entries]) => read(entries),
		error: (err) => logger.error("Balance watcher failed", { chainId, err }),
	});

	return {
		entries$,
		stop: () => {
			stopped = true;
			subscription.unsubscribe();
		},
	};
};

const CHAIN_WATCHERS = new Map<ChainId, ChainWatcher>();

const sameEntries = (a: BalanceEntry[], b: BalanceEntry[]) =>
	a.length === b.length &&
	a.every((entry, i) => entry.balanceId === b[i]?.balanceId);

const syncStatuses = (balanceIds: BalanceId[]) => {
	const statuses = statusByBalanceId$.value;
	const next = Object.fromEntries(
		balanceIds.map((balanceId) => [
			balanceId,
			statuses[balanceId] ?? "loading",
		]),
	);
	if (!isEqual(statuses, next)) statusByBalanceId$.next(next);
};

balanceSubscriptions$.subscribe((balanceIds) => {
	try {
		const entriesByChain = groupEntriesByChain(balanceIds);

		for (const [chainId, watcher] of CHAIN_WATCHERS)
			if (!entriesByChain.has(chainId)) {
				watcher.stop();
				CHAIN_WATCHERS.delete(chainId);
			}

		for (const [chainId, entries] of entriesByChain) {
			const watcher = CHAIN_WATCHERS.get(chainId);
			if (!watcher)
				CHAIN_WATCHERS.set(chainId, watchChainBalances(chainId, entries));
			else if (!sameEntries(watcher.entries$.value, entries))
				watcher.entries$.next(entries);
		}

		syncStatuses(balanceIds);
	} catch (err) {
		logger.error("Failed to update balance watchers", { balanceIds, err });
	}
});

export const balanceStatuses$ = statusByBalanceId$.asObservable();

export const getBalancesWatchersCount = () =>
	[...CHAIN_WATCHERS.values()].reduce(
		(count, watcher) => count + watcher.entries$.value.length,
		0,
	);
