import { isEqual, isNumber, keyBy, values } from "lodash";
import { distinctUntilChanged, filter } from "rxjs";

import { tokensStore$ } from "./store";
import { tokensByChainSubscriptions$ } from "./subscriptions";

import {
	STORAGE_QUERY_TIMEOUT,
	TOKENS_CACHE_DURATION,
} from "@kheopswap/constants";
import { getApi } from "@kheopswap/papi";
import {
	type Chain,
	type ChainId,
	getChainById,
	hasAssetPallet,
	isAssetHub,
} from "@kheopswap/registry";
import {
	KNOWN_TOKENS_MAP,
	TOKENS_OVERRIDES_MAP,
	type Token,
	getTokenId,
} from "@kheopswap/registry";
import { logger, safeStringify, sleep, throwAfter } from "@kheopswap/utils";
import { pollChainStatus } from "../pollChainStatus";

const { getLoadingStatus$, loadingStatusByChain$, setLoadingStatus } =
	pollChainStatus("tokensByChainStatuses", TOKENS_CACHE_DURATION);

export const chainTokensStatuses$ = loadingStatusByChain$.asObservable();

const WATCHERS = new Map<ChainId, () => void>();

const fetchForeignAssetTokens = async (chain: Chain, signal: AbortSignal) => {
	if (isAssetHub(chain)) {
		const api = await getApi(chain.id);
		if (signal.aborted) return;

		await api.waitReady;
		if (signal.aborted) return;

		const stop = logger.timer(`fetch foreign assets - ${chain.id}`);
		// not all foreign assets have metadata registered on assethub
		// print a warning if metadata is missing
		const [assets, metadatas] = await Promise.all([
			api.query.ForeignAssets.Asset.getEntries({
				at: "best",
				signal,
			}),
			api.query.ForeignAssets.Metadata.getEntries({
				at: "best",
				signal,
			}),
		]);

		stop();

		const foreignAssetTokens = assets
			.map((d) => ({
				id: getTokenId({
					type: "foreign-asset",
					chainId: chain.id,
					location: d.keyArgs[0],
				}),
				location: d.keyArgs[0],
				metadata: metadatas.find(
					//lodash isEqual doesn't work with bigints
					(m) => safeStringify(m.keyArgs[0]) === safeStringify(d.keyArgs[0]),
				)?.value,
			}))
			.map(({ id, location, metadata }) =>
				Object.assign(
					{
						id,
						type: "foreign-asset",
						chainId: chain.id,
						location,
						symbol: metadata?.symbol.asText(),
						decimals: metadata?.decimals,
						name: metadata?.name.asText(),
						logo: "./img/tokens/asset.svg",
						verified: false,
					} as Token,
					KNOWN_TOKENS_MAP[id],
					TOKENS_OVERRIDES_MAP[id],
				),
			)
			.filter((token) => {
				if (!token.symbol || !isNumber(token.decimals) || !token.name) {
					logger.warn("No metadata found for foreign asset", {
						id: token.id,
						location:
							token.type === "foreign-asset" && safeStringify(token.location),
						token,
					});
					return false;
				}
				return true;
			});

		logger.info("foreign assets", foreignAssetTokens);

		const currentTokens = values(tokensStore$.value);

		const otherTokens = currentTokens.filter(
			(t) => t.chainId !== chain.id || t.type !== "foreign-asset",
		);

		const newValue = keyBy([...otherTokens, ...foreignAssetTokens], "id");

		if (!isEqual(currentTokens, newValue)) tokensStore$.next(newValue);
	}
};

const fetchPoolAssetTokens = async (chain: Chain, signal: AbortSignal) => {
	if (isAssetHub(chain)) {
		const api = await getApi(chain.id);
		if (signal.aborted) return;

		await api.waitReady;
		if (signal.aborted) return;

		const stop = logger.timer(
			`chain.api.query.PoolAssets.Asset.getEntries() - ${chain.id}`,
		);
		const tokens = await api.query.PoolAssets.Asset.getEntries({
			at: "best",
			signal,
		});
		stop();

		const assetTokens = tokens
			.map((lp) => ({
				id: getTokenId({
					type: "pool-asset",
					chainId: chain.id,
					poolAssetId: lp.keyArgs[0],
				}),
				poolAssetId: lp.keyArgs[0],
			}))
			.map(
				({ id, poolAssetId }) =>
					({
						id,
						type: "pool-asset",
						chainId: chain.id,
						poolAssetId,
						symbol: "",
						decimals: 0,
						name: "",
						logo: "",
						isSufficient: false,
						...TOKENS_OVERRIDES_MAP[id],
					}) as Token,
			);

		const currentTokens = values(tokensStore$.value);

		const otherTokens = currentTokens.filter(
			(t) => t.chainId !== chain.id || t.type !== "pool-asset",
		);

		const newValue = keyBy([...otherTokens, ...assetTokens], "id");

		if (!isEqual(currentTokens, newValue)) tokensStore$.next(newValue);
	}
};

const fetchAssetTokens = async (chain: Chain, signal: AbortSignal) => {
	if (hasAssetPallet(chain)) {
		const api = await getApi(chain.id);
		if (signal.aborted) return;

		await api.waitReady;
		if (signal.aborted) return;

		const stop = logger.timer(
			`chain.api.query.Assets.Metadata.getEntries() - ${chain.id}`,
		);
		const tokens = await api.query.Assets.Metadata.getEntries({
			at: "best",
			signal,
		});
		stop();

		const assetTokens = tokens
			.map((d) => ({
				assetId: d.keyArgs[0],
				symbol: d.value.symbol.asText(),
				decimals: d.value.decimals,
				name: d.value.name.asText(),
			}))
			.map((d) => ({
				...d,
				id: getTokenId({
					type: "asset",
					chainId: chain.id,
					assetId: d.assetId,
				}),
			}))
			.map(({ id, assetId, symbol, decimals, name }) =>
				Object.assign(
					{
						id,
						type: "asset",
						chainId: chain.id,
						assetId,
						symbol,
						decimals,
						name,
						logo: "./img/tokens/asset.svg",
						verified: false,
						isSufficient: false, // all sufficient assets need to be defined in KNOWN_TOKENS_MAP, otherwise we'd need to do an additional huge query on startup
					} as Token,
					KNOWN_TOKENS_MAP[id],
					TOKENS_OVERRIDES_MAP[id],
				),
			);

		const currentTokens = values(tokensStore$.value);

		const otherTokens = currentTokens.filter(
			(t) => t.chainId !== chain.id || t.type !== "asset",
		);

		const newValue = keyBy([...otherTokens, ...assetTokens], "id");

		if (!isEqual(currentTokens, newValue)) tokensStore$.next(newValue);
	}
};

const watchTokensByChain = (chainId: ChainId) => {
	const watchController = new AbortController();
	let retryTimeout = 3_000;

	const refresh = async () => {
		if (watchController.signal.aborted) return;

		const refreshController = new AbortController();
		const cancelRefresh = () => refreshController.abort();
		watchController.signal.addEventListener("abort", cancelRefresh);

		try {
			setLoadingStatus(chainId, "loading");

			const chain = getChainById(chainId);
			if (!chain) throw new Error(`Could not find chain ${chainId}`);

			await Promise.race([
				Promise.all([
					fetchAssetTokens(chain, refreshController.signal),
					fetchPoolAssetTokens(chain, refreshController.signal),
					fetchForeignAssetTokens(chain, refreshController.signal),
				]),
				throwAfter(STORAGE_QUERY_TIMEOUT, "Failed to fetch tokens (timeout)"),
			]);

			if (!watchController.signal.aborted) setLoadingStatus(chainId, "loaded");
		} catch (err) {
			refreshController.abort();
			console.error("Failed to fetch tokens", { chainId, err });
			// wait before retrying to prevent browser from hanging
			await sleep(retryTimeout);
			retryTimeout *= 2; // increase backoff duration
			setLoadingStatus(chainId, "stale");
		}

		watchController.signal.removeEventListener("abort", cancelRefresh);
	};

	const sub = getLoadingStatus$(chainId)
		.pipe(
			distinctUntilChanged(),
			filter((status) => status === "stale"),
		)
		.subscribe(() => {
			refresh();
		});

	return () => {
		sub.unsubscribe();
		watchController.abort();
	};
};

tokensByChainSubscriptions$.subscribe((chainIds) => {
	// remove watchers that are not needed anymore
	const existingIds = Array.from(WATCHERS.keys());
	const watchersToStop = existingIds.filter((id) => !chainIds.includes(id));

	for (const chainId of watchersToStop) {
		WATCHERS.get(chainId)?.();
		WATCHERS.delete(chainId);
	}
	setLoadingStatus(watchersToStop, "stale");

	// add missing watchers
	for (const chainId of chainIds.filter((id) => !WATCHERS.has(id)))
		WATCHERS.set(chainId, watchTokensByChain(chainId));
});

export const getTokensWatchersCount = () => WATCHERS.size;