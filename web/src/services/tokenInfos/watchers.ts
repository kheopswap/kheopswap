import { BehaviorSubject, type Subscription } from "rxjs";

import { tokenInfosSubscriptions$ } from "./subscriptions";

import type { Dictionary } from "lodash";
import { getChainById } from "src/config/chains";
import { type TokenId, type TokenInfo, parseTokenId } from "src/config/tokens";
import type {
	TokenIdAsset,
	TokenIdForeignAsset,
	TokenIdNative,
	TokenIdPoolAsset,
} from "src/config/tokens/types";
import { getApi, isApiAssetHub } from "src/services/api";
import type { LoadingStatus } from "src/services/common";
import { logger } from "src/util";
import { tokenInfosStore$ } from "./store";

const statusByTokenId$ = new BehaviorSubject<Dictionary<LoadingStatus>>({});

const WATCHERS = new Map<TokenId, Promise<Subscription>>();

const updateTokenInfoLoadingStatus = (
	tokenId: TokenId,
	status: LoadingStatus,
) => {
	if (statusByTokenId$.value[tokenId] === status) return;

	statusByTokenId$.next({
		...statusByTokenId$.value,
		[tokenId]: status,
	});
};

const updateTokenInfo = (tokenInfo: TokenInfo) => {
	// update balances store
	tokenInfosStore$.next({
		...tokenInfosStore$.value,
		[tokenInfo.id]: tokenInfo,
	});

	// indicate it's loaded
	updateTokenInfoLoadingStatus(tokenInfo.id, "loaded");
};

const watchTokenInfo = async (tokenId: TokenId): Promise<Subscription> => {
	const token = parseTokenId(tokenId);
	const chain = getChainById(token.chainId);
	if (!chain) throw new Error(`Chain not found for ${token.chainId}`);

	const api = await getApi(chain.id);

	updateTokenInfoLoadingStatus(tokenId, "loading");

	switch (token.type) {
		case "native": {
			const [minBalance, supply$] = await Promise.all([
				api.constants.Balances.ExistentialDeposit(),
				api.query.Balances.TotalIssuance.watchValue("best"),
			]);

			return supply$.subscribe((supply) => {
				updateTokenInfo({
					id: tokenId as TokenIdNative,
					type: "native",
					minBalance,
					supply,
				});
			});
		}

		case "asset": {
			if (!isApiAssetHub(api))
				throw new Error(
					`Cannot watch token infos for ${tokenId}. Assets are not supported on ${chain.id}`,
				);

			const tokenInfo$ = api.query.Assets.Asset.watchValue(
				token.assetId,
				"best",
			);

			return tokenInfo$.subscribe((asset) => {
				if (asset)
					updateTokenInfo({
						id: tokenId as TokenIdAsset,
						type: "asset",
						accounts: asset.accounts,
						owner: asset.owner,
						admin: asset.admin,
						freezer: asset.freezer,
						issuer: asset.issuer,
						minBalance: asset.min_balance,
						supply: asset?.supply,
						status: asset.status.type,
					});
			});
		}

		case "foreign-asset": {
			if (!isApiAssetHub(api))
				throw new Error(
					`Cannot watch token infos for ${tokenId}. ForeignAssets are not supported on ${chain.id}`,
				);

			const tokenInfo$ = api.query.ForeignAssets.Asset.watchValue(
				token.location,
				"best",
			);

			return tokenInfo$.subscribe((asset) => {
				if (asset)
					updateTokenInfo({
						id: tokenId as TokenIdForeignAsset,
						type: "foreign-asset",
						accounts: asset.accounts,
						owner: asset.owner,
						admin: asset.admin,
						freezer: asset.freezer,
						issuer: asset.issuer,
						minBalance: asset.min_balance,
						supply: asset?.supply,
						status: asset.status.type,
					});
			});
		}

		case "pool-asset": {
			if (!isApiAssetHub(api))
				throw new Error(
					`Cannot watch token infos for ${tokenId}. PoolAssets are not supported on ${chain.id}`,
				);

			const tokenInfo$ = api.query.PoolAssets.Asset.watchValue(
				token.poolAssetId,
				"best",
			);

			return tokenInfo$.subscribe((asset) => {
				if (asset)
					updateTokenInfo({
						id: tokenId as TokenIdPoolAsset,
						type: "pool-asset",
						accounts: asset.accounts,
						owner: asset.owner,
						admin: asset.admin,
						freezer: asset.freezer,
						issuer: asset.issuer,
						minBalance: asset.min_balance,
						supply: asset?.supply,
						status: asset.status.type,
					});
			});
		}
	}
};

// subscribe to the list of the unique tokenIds to watch
// and update watchers accordingly
tokenInfosSubscriptions$.subscribe((tokenIds) => {
	try {
		// add missing watchers
		for (const tokenId of tokenIds.filter((id) => !WATCHERS.has(id))) {
			WATCHERS.set(tokenId, watchTokenInfo(tokenId));
		}

		// remove watchers that are not needed anymore
		const existingIds = Array.from(WATCHERS.keys());
		const watchersToStop = existingIds.filter((id) => !tokenIds.includes(id));
		for (const tokenId of watchersToStop) {
			WATCHERS.get(tokenId)?.then((watcher) => watcher.unsubscribe());
			WATCHERS.delete(tokenId);
		}
		statusByTokenId$.next({
			...statusByTokenId$.value,
			...Object.fromEntries(watchersToStop.map((id) => [id, "stale"])),
		});
	} catch (err) {
		logger.error("Failed to update token infos watchers", { tokenIds, err });
	}
});

export const tokenInfosStatuses$ = statusByTokenId$.asObservable();

export const getTokenInfosWatchersCount = () => WATCHERS.size;
