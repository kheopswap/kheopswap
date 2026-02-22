import { isNumber } from "lodash-es";
import { distinctUntilChanged, filter } from "rxjs";
import {
	STORAGE_QUERY_TIMEOUT,
	TOKENS_CACHE_DURATION,
} from "../../common/constants";
import { getApi } from "../../papi/getApi";
import { getChainById } from "../../registry/chains/chains";
import type { Chain, ChainId } from "../../registry/chains/types";
import { TOKENS_BLACKLIST } from "../../registry/tokens/blacklist";
import { buildToken } from "../../registry/tokens/buildToken";
import {
	createSufficientMap,
	mapAssetTokensFromEntries,
	mapForeignAssetTokensFromEntries,
	mapPoolAssetTokensFromEntries,
} from "../../registry/tokens/mappers";
import {
	KNOWN_TOKENS_MAP,
	TOKENS_OVERRIDES_MAP,
} from "../../registry/tokens/tokens";
import type { Token } from "../../registry/tokens/types";
import { logger } from "../../utils/logger";
import { safeStringify } from "../../utils/serialization";
import { sleep } from "../../utils/sleep";
import { throwAfter } from "../../utils/throwAfter";
import { pollChainStatus } from "../pollChainStatus";
import { updateTokensStore } from "./store";
import { tokensByChainSubscriptions$ } from "./subscriptions";

const { getLoadingStatus$, loadingStatusByChain$, setLoadingStatus } =
	pollChainStatus("tokensByChainStatuses", TOKENS_CACHE_DURATION);

const WATCHERS = new Map<ChainId, () => void>();

const fetchForeignAssetTokens = async (chain: Chain, signal: AbortSignal) => {
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

	const foreignAssetTokens = mapForeignAssetTokensFromEntries(
		chain.id,
		assets,
		metadatas,
	)
		.map((tokenNoId) => {
			const token = buildToken({
				...tokenNoId,
				chainId: chain.id,
				logo: "./img/tokens/asset.svg",
			});
			return Object.assign(
				token,
				KNOWN_TOKENS_MAP[token.id],
				TOKENS_OVERRIDES_MAP[token.id],
			);
		})
		.filter((token) => {
			if (TOKENS_BLACKLIST.has(token.id)) return false;
			if (!token.symbol || !isNumber(token.decimals) || !token.name) {
				logger.warn("No metadata found for foreign asset", {
					id: token.id,
					location:
						token.type === "foreign-asset" && safeStringify(token.location),
					token,
				});
				if (
					token.type === "foreign-asset" &&
					token.location.interior.type === "X2" &&
					token.location.interior.value[0]?.type === "GlobalConsensus" &&
					token.location.interior.value[0].value.type === "Ethereum"
				) {
					logger.warn(
						"Ethereum chain ID:",
						token.location.interior.value[0].value.value.chain_id,
					);
					if (
						token.type === "foreign-asset" &&
						token.location.interior.type === "X2" &&
						token.location.interior.value[1]?.type === "AccountKey20"
					) {
						logger.warn(
							"Contract:",
							token.location.interior.value[1].value.key,
						);
					}
				}

				return false;
			}
			return true;
		});

	updateTokensStore(chain.id, "foreign-asset", foreignAssetTokens);
};

const fetchPoolAssetTokens = async (chain: Chain, signal: AbortSignal) => {
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

	const assetTokens = mapPoolAssetTokensFromEntries(chain.id, tokens).map(
		(tokenNoId) => {
			const token = buildToken({
				...tokenNoId,
				chainId: chain.id,
				verified: undefined,
			});
			return Object.assign(token, TOKENS_OVERRIDES_MAP[token.id]) as Token;
		},
	);

	updateTokensStore(
		chain.id,
		"pool-asset",
		assetTokens.filter((t) => !TOKENS_BLACKLIST.has(t.id)),
	);
};

const fetchAssetTokens = async (chain: Chain, signal: AbortSignal) => {
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

	const assetTokens = mapAssetTokensFromEntries(
		chain.id,
		tokens,
		createSufficientMap([]),
	).map((tokenNoId) => {
		const token = buildToken({
			...tokenNoId,
			chainId: chain.id,
			logo: "./img/tokens/asset.svg",
			verified: false,
			isSufficient: false, // all sufficient assets need to be defined in KNOWN_TOKENS_MAP, otherwise we'd need to do an additional huge query on startup
		});
		return Object.assign(
			token,
			KNOWN_TOKENS_MAP[token.id],
			TOKENS_OVERRIDES_MAP[token.id],
		);
	});

	updateTokensStore(
		chain.id,
		"asset",
		assetTokens.filter((t) => !TOKENS_BLACKLIST.has(t.id)),
	);
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

export const chainTokensStatuses$ = loadingStatusByChain$;

export const getTokensWatchersCount = () => WATCHERS.size;
