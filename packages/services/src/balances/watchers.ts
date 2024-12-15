import { BehaviorSubject, type Subscription } from "rxjs";

import { balancesStore$ } from "./store";
import { balanceSubscriptions$ } from "./subscriptions";
import type { BalanceId } from "./types";
import { parseBalanceId } from "./utils";

import {
	getApi,
	isApiAssetHub,
	isApiBifrostPolkadot,
	isApiHydration,
} from "@kheopswap/papi";
import { type ChainIdHydration, getChainById } from "@kheopswap/registry";
import { parseTokenId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import type { Dictionary } from "lodash";
import type { LoadingStatus } from "../common";
import { getHydrationAssetsBalances$ } from "./hydration";

const statusByBalanceId$ = new BehaviorSubject<Dictionary<LoadingStatus>>({});

const WATCHERS = new Map<BalanceId, Promise<Subscription>>();

const updateBalanceLoadingStatus = (
	balanceId: BalanceId,
	status: LoadingStatus,
) => {
	const stop = logger.cumulativeTimer("updateBalanceLoadingStatus");

	if (statusByBalanceId$.value[balanceId] !== status)
		statusByBalanceId$.next(
			Object.assign(statusByBalanceId$.value, { [balanceId]: status }),
		);

	stop();
};

const updateBalance = (balanceId: BalanceId, balance: bigint) => {
	const stop = logger.cumulativeTimer("updateBalance");

	const { tokenId, address } = parseBalanceId(balanceId);

	// update balances store if necessary
	if (balancesStore$.value[balanceId]?.balance !== balance)
		balancesStore$.next(
			Object.assign(balancesStore$.value, {
				[balanceId]: { address, tokenId, balance },
			}),
		);

	// indicate it's loaded
	updateBalanceLoadingStatus(balanceId, "loaded");

	stop();
};

const watchBalance = async (balanceId: BalanceId) => {
	const { tokenId, address } = parseBalanceId(balanceId);
	const token = parseTokenId(tokenId);
	const chain = getChainById(token.chainId);
	if (!chain) throw new Error(`Chain not found for ${token.chainId}`);

	const api = await getApi(chain.id);

	updateBalanceLoadingStatus(balanceId, "loading");

	switch (token.type) {
		case "native": {
			const account$ = api.query.System.Account.watchValue(address, "best");

			return account$.subscribe((account) => {
				const balance = account.data.free - account.data.frozen;

				updateBalance(balanceId, balance);
			});
		}
		case "asset": {
			if (!isApiAssetHub(api)) {
				console.warn("OOPS", { token, chain, balanceId });
				throw new Error(
					`Cannot watch balance for ${tokenId}. Assets are not supported on ${chain.id}`,
				);
			}
			const account$ = api.query.Assets.Account.watchValue(
				token.assetId,
				address,
				"best",
			);

			return account$.subscribe((account) => {
				const balance =
					account?.status.type === "Liquid" ? account.balance : 0n;
				updateBalance(balanceId, balance);
			});
		}
		case "pool-asset": {
			if (!isApiAssetHub(api))
				throw new Error(
					`Cannot watch balance for ${tokenId}. PoolAssets are not supported on ${chain.id}`,
				);

			const account$ = api.query.PoolAssets.Account.watchValue(
				token.poolAssetId,
				address,
				"best",
			);

			return account$.subscribe((account) => {
				const balance =
					account?.status.type === "Liquid" ? account.balance : 0n;
				updateBalance(balanceId, balance);
			});
		}
		case "foreign-asset": {
			if (!isApiAssetHub(api))
				throw new Error(
					`Cannot watch balance for ${tokenId}. ForeignAssets are not supported on ${chain.id}`,
				);

			const account$ = api.query.ForeignAssets.Account.watchValue(
				token.location,
				address,
				"best",
			);

			return account$.subscribe((account) => {
				const balance =
					account?.status.type === "Liquid" ? account.balance : 0n;
				updateBalance(balanceId, balance);
			});
		}
		case "x-token": {
			if (!isApiBifrostPolkadot(api))
				throw new Error(
					`Cannot watch balance for ${tokenId}. x-tokens are not supported on ${chain.id}`,
				);

			const account$ = api.query.Tokens.Accounts.watchValue(
				address,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				token.key as any,
				"best",
			);

			return account$.subscribe((account) => {
				updateBalance(balanceId, account.free);
			});
		}
		case "hydration-asset": {
			if (!isApiHydration(api))
				throw new Error(
					`Cannot watch balance for ${tokenId}. HydrationAssets are not supported on ${chain.id}`,
				);

			return getHydrationAssetsBalances$(
				chain.id as ChainIdHydration,
				address,
			).subscribe((results) => {
				const balance =
					results.find((result) => result.assetId === token.assetId)?.balance ??
					0n;

				updateBalance(balanceId, balance);
			});
		}
		default:
			throw new Error(`Unsupported token type ${tokenId}`);
	}
};

const sortBalanceIdsByBalanceDesc = (bid1: BalanceId, bid2: BalanceId) => {
	const [b1, b2] = [bid1, bid2].map(
		(balanceId) => balancesStore$.value[balanceId]?.balance ?? 0n,
	) as [bigint, bigint];

	if (b1 > b2) return -1;
	if (b1 < b2) return 1;
	return 0;
};

// subscribe to the list of the unique balanceIds to watch
// and update watchers accordingly
balanceSubscriptions$.subscribe((balanceIds) => {
	try {
		// add missing watchers
		for (const balanceId of balanceIds
			.filter((id) => !WATCHERS.has(id))
			// prioritize watchers for positive balance first, to reduce user waiting time
			.sort(sortBalanceIdsByBalanceDesc)) {
			WATCHERS.set(balanceId, watchBalance(balanceId));
		}

		// remove watchers that are not needed anymore
		const existingIds = Array.from(WATCHERS.keys());
		const watchersToStop = existingIds.filter((id) => !balanceIds.includes(id));
		for (const balanceId of watchersToStop) {
			WATCHERS.get(balanceId)?.then((watcher) => watcher.unsubscribe());
			WATCHERS.delete(balanceId);
		}
		statusByBalanceId$.next({
			...statusByBalanceId$.value,
			...Object.fromEntries(watchersToStop.map((id) => [id, "stale"])),
		});
	} catch (err) {
		logger.error("Failed to update balance watchers", { balanceIds, err });
	}
});

export const balanceStatuses$ = statusByBalanceId$.asObservable();

export const getBalancesWatchersCount = () => WATCHERS.size;
