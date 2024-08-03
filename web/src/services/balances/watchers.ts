import { BehaviorSubject, type Subscription } from "rxjs";

import { balancesStore$ } from "./store";
import { balanceSubscriptions$ } from "./subscriptions";
import type { BalanceId } from "./types";
import { parseBalanceId } from "./utils";

import { getChainById } from "src/config/chains";
import { parseTokenId } from "src/config/tokens";
import { getApi, isApiAssetHub } from "src/services/api";
import type { LoadingStatus } from "src/services/common";
import { logger } from "src/util";

export const balanceStatuses$ = new BehaviorSubject<
	Record<BalanceId, LoadingStatus>
>({});

const WATCHERS = new Map<BalanceId, Promise<Subscription>>();

const updateBalanceLoadingStatus = (
	balanceId: BalanceId,
	status: LoadingStatus,
) => {
	if (balanceStatuses$.value[balanceId] === status) return;

	balanceStatuses$.next({
		...balanceStatuses$.value,
		[balanceId]: status,
	});
};

const updateBalance = (balanceId: BalanceId, balance: bigint) => {
	const { tokenId, address } = parseBalanceId(balanceId);

	const newBalances = balancesStore$.value
		.filter((b) => b.tokenId !== tokenId || b.address !== address)
		.concat({ address, tokenId, balance: balance.toString() });

	// update balances store
	balancesStore$.next(newBalances);

	// indicate it's loaded
	updateBalanceLoadingStatus(balanceId, "loaded");
};

const watchBalance = async (balanceId: BalanceId) => {
	const { tokenId, address } = parseBalanceId(balanceId);
	const token = parseTokenId(tokenId);
	const chain = getChainById(token.chainId);
	if (!chain) throw new Error("Chain not found for " + token.chainId);

	const api = await getApi(chain.id);

	updateBalanceLoadingStatus(balanceId, "loading");

	switch (token.type) {
		case "native": {
			const obsAccount = api.query.System.Account.watchValue(address, "best");

			return obsAccount.subscribe((account) => {
				const balance = account.data.free - account.data.frozen;
				updateBalance(balanceId, balance);
			});
		}
		case "asset": {
			if (!isApiAssetHub(api))
				throw new Error(
					`Cannot watch balance for ${tokenId}. Assets are not supported on ${chain.id}`,
				);

			const obsAccount = api.query.Assets.Account.watchValue(
				token.assetId,
				address,
				"best",
			);

			return obsAccount.subscribe((account) => {
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

			const obsAccount = api.query.PoolAssets.Account.watchValue(
				token.poolAssetId,
				address,
				"best",
			);

			return obsAccount.subscribe((account) => {
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

			const obsAccount = api.query.ForeignAssets.Account.watchValue(
				token.location,
				address,
				"best",
			);

			return obsAccount.subscribe((account) => {
				const balance =
					account?.status.type === "Liquid" ? account.balance : 0n;
				updateBalance(balanceId, balance);
			});
		}
	}
};

const sortBalanceIdsByBalanceDesc = (bid1: BalanceId, bid2: BalanceId) => {
	const [b1, b2] = [bid1, bid2]
		.map(parseBalanceId)
		.map(({ address, tokenId }) =>
			balancesStore$.value.find(
				(b) => b.tokenId === tokenId && b.address === address,
			),
		)
		.map((b) => b?.balance ?? 0n);

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
		balanceStatuses$.next({
			...balanceStatuses$.value,
			...watchersToStop.reduce((acc, id) => ({ ...acc, [id]: "stale" }), {}),
		});
	} catch (err) {
		logger.error("Failed to update balance watchers", { balanceIds, err });
	}
});

export const getBalancesWatchersCount = () => WATCHERS.size;
