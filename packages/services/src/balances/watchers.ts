import { getApi } from "@kheopswap/papi";
import { getChainById, parseTokenId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { BehaviorSubject, type Subscription } from "rxjs";
import type { LoadingStatus } from "../common";
import { balancesStore$ } from "./store";
import { balanceSubscriptions$ } from "./subscriptions";
import type { BalanceId } from "./types";
import { parseBalanceId } from "./utils";

const statusByBalanceId$ = new BehaviorSubject<Record<string, LoadingStatus>>(
	{},
);

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

// Subscribe to the list of the unique balanceIds to watch and update watchers accordingly.
// NOTE: When watchers are removed, we intentionally keep the cached balance data in the store.
// This allows instant display of cached values when the user navigates back to a page,
// while fresh data is fetched in the background. The store persists to localStorage and
// will be refreshed on subsequent visits. Do not add store cleanup here.
balanceSubscriptions$.subscribe((balanceIds) => {
	try {
		// remove watchers that are not needed anymore
		const existingIds = Array.from(WATCHERS.keys());
		const watchersToStop = existingIds.filter((id) => !balanceIds.includes(id));
		for (const balanceId of watchersToStop) {
			const watcher = WATCHERS.get(balanceId);
			WATCHERS.delete(balanceId);
			watcher?.then((sub) => sub.unsubscribe()).catch(() => {});
		}

		// Clean up statuses for stopped watchers
		if (watchersToStop.length > 0) {
			const currentStatuses = statusByBalanceId$.value;
			const newStatuses = { ...currentStatuses };
			for (const id of watchersToStop) {
				delete newStatuses[id];
			}
			statusByBalanceId$.next(newStatuses);
		}

		// add missing watchers
		for (const balanceId of balanceIds
			.filter((id) => !WATCHERS.has(id))
			// prioritize watchers for positive balance first, to reduce user waiting time
			.sort(sortBalanceIdsByBalanceDesc)) {
			WATCHERS.set(
				balanceId,
				watchBalance(balanceId).catch((err) => {
					logger.error("Failed to start balance watcher", { balanceId, err });
					updateBalanceLoadingStatus(balanceId, "stale");
					WATCHERS.delete(balanceId);
					// Return a no-op subscription to satisfy the type
					return { unsubscribe: () => {} } as Subscription;
				}),
			);
		}
	} catch (err) {
		logger.error("Failed to update balance watchers", { balanceIds, err });
	}
});

export const balanceStatuses$ = statusByBalanceId$.asObservable();

export const getBalancesWatchersCount = () => WATCHERS.size;
