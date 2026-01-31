import { BALANCE_POLL_INTERVAL } from "@kheopswap/constants";
import { getApi } from "@kheopswap/papi";
import { getChainById, parseTokenId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import {
	BehaviorSubject,
	filter,
	merge,
	type Subscription,
	switchMap,
	timer,
} from "rxjs";
import type { LoadingStatus } from "../common";
import { balanceRefreshTrigger$ } from "./refresh";
import { balancesStore$ } from "./store";
import {
	balanceSubscriptions$,
	effectiveModes$,
	getEffectiveMode,
} from "./subscriptions";
import type { BalanceId, BalanceSubscriptionMode } from "./types";
import { parseBalanceId } from "./utils";

const statusByBalanceId$ = new BehaviorSubject<Record<string, LoadingStatus>>(
	{},
);

const WATCHERS = new Map<BalanceId, Promise<Subscription>>();
const WATCHER_MODES = new Map<BalanceId, BalanceSubscriptionMode>();

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

/**
 * Fetch balance once (for poll mode)
 */
const fetchBalanceOnce = async (balanceId: BalanceId): Promise<bigint> => {
	const { tokenId, address } = parseBalanceId(balanceId);
	const token = parseTokenId(tokenId);
	const chain = getChainById(token.chainId);
	if (!chain) throw new Error(`Chain not found for ${token.chainId}`);

	const api = await getApi(chain.id);

	switch (token.type) {
		case "native": {
			const account = await api.query.System.Account.getValue(address);
			return account.data.free - account.data.frozen;
		}
		case "asset": {
			const account = await api.query.Assets.Account.getValue(
				token.assetId,
				address,
			);
			return account?.status.type === "Liquid" ? account.balance : 0n;
		}
		case "pool-asset": {
			const account = await api.query.PoolAssets.Account.getValue(
				token.poolAssetId,
				address,
			);
			return account?.status.type === "Liquid" ? account.balance : 0n;
		}
		case "foreign-asset": {
			const account = await api.query.ForeignAssets.Account.getValue(
				token.location,
				address,
			);
			return account?.status.type === "Liquid" ? account.balance : 0n;
		}
		default:
			throw new Error(`Unsupported token type ${tokenId}`);
	}
};

/**
 * Watch balance with real-time updates (live mode)
 */
const watchBalanceLive = async (
	balanceId: BalanceId,
): Promise<Subscription> => {
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

/**
 * Watch balance with periodic polling (poll mode)
 */
const watchBalancePoll = (balanceId: BalanceId): Subscription => {
	updateBalanceLoadingStatus(balanceId, "loading");

	// Merge timer with manual refresh trigger
	const poll$ = merge(
		// Periodic timer: emit immediately, then every BALANCE_POLL_INTERVAL
		timer(0, BALANCE_POLL_INTERVAL),
		// Manual refresh trigger: filter to only refresh this balance
		balanceRefreshTrigger$.pipe(
			filter((ids) => !ids || ids.includes(balanceId)),
		),
	);

	return poll$
		.pipe(
			switchMap(async () => {
				try {
					const balance = await fetchBalanceOnce(balanceId);
					updateBalance(balanceId, balance);
				} catch (err) {
					logger.error("Failed to poll balance", { balanceId, err });
					updateBalanceLoadingStatus(balanceId, "stale");
				}
			}),
		)
		.subscribe();
};

/**
 * Start watching a balance with the appropriate mode
 */
const watchBalance = async (
	balanceId: BalanceId,
	mode: BalanceSubscriptionMode,
): Promise<Subscription> => {
	if (mode === "poll") {
		return watchBalancePoll(balanceId);
	}
	return watchBalanceLive(balanceId);
};

const sortBalanceIdsByBalanceDesc = (bid1: BalanceId, bid2: BalanceId) => {
	const [b1, b2] = [bid1, bid2].map(
		(balanceId) => balancesStore$.value[balanceId]?.balance ?? 0n,
	) as [bigint, bigint];

	if (b1 > b2) return -1;
	if (b1 < b2) return 1;
	return 0;
};

/**
 * Stop and restart a watcher with a new mode
 */
const restartWatcher = async (
	balanceId: BalanceId,
	newMode: BalanceSubscriptionMode,
) => {
	const existingWatcher = WATCHERS.get(balanceId);
	if (existingWatcher) {
		WATCHERS.delete(balanceId);
		WATCHER_MODES.delete(balanceId);
		existingWatcher.then((sub) => sub.unsubscribe()).catch(() => {});
	}

	WATCHER_MODES.set(balanceId, newMode);
	WATCHERS.set(
		balanceId,
		watchBalance(balanceId, newMode).catch((err) => {
			logger.error("Failed to start balance watcher", { balanceId, err });
			updateBalanceLoadingStatus(balanceId, "stale");
			WATCHERS.delete(balanceId);
			WATCHER_MODES.delete(balanceId);
			return { unsubscribe: () => {} } as Subscription;
		}),
	);
};

// Subscribe to mode changes to restart watchers when mode changes
effectiveModes$.subscribe((modes) => {
	for (const [balanceId, newMode] of Object.entries(modes)) {
		const currentMode = WATCHER_MODES.get(balanceId);
		if (currentMode && currentMode !== newMode) {
			logger.debug("Balance watcher mode changed", {
				balanceId,
				from: currentMode,
				to: newMode,
			});
			restartWatcher(balanceId, newMode);
		}
	}
});

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
				WATCHER_MODES.delete(id);
			}
			statusByBalanceId$.next(newStatuses);
		}

		// add missing watchers
		for (const balanceId of balanceIds
			.filter((id) => !WATCHERS.has(id))
			// prioritize watchers for positive balance first, to reduce user waiting time
			.sort(sortBalanceIdsByBalanceDesc)) {
			const mode = getEffectiveMode(balanceId);
			WATCHER_MODES.set(balanceId, mode);
			WATCHERS.set(
				balanceId,
				watchBalance(balanceId, mode).catch((err) => {
					logger.error("Failed to start balance watcher", { balanceId, err });
					updateBalanceLoadingStatus(balanceId, "stale");
					WATCHERS.delete(balanceId);
					WATCHER_MODES.delete(balanceId);
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
