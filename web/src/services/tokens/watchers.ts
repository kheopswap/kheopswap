import { distinctUntilChanged, map } from "rxjs";
import { isEqual } from "lodash";

import { tokensByChainSubscriptions$ } from "./subscriptions";
import { tokensStore$ } from "./store";
import { sortTokens } from "./util";

import {
  Chain,
  ChainId,
  getChainById,
  hasAssetPallet,
  isAssetHub,
} from "src/config/chains";
import { getTokenId, Token, KNOWN_TOKENS_MAP } from "src/config/tokens";
import { logger, throwAfter } from "src/util";
import { getApi } from "src/services/api";
import {
  STORAGE_QUERY_TIMEOUT,
  TOKENS_CACHE_DURATION,
} from "src/config/constants";
import { initializeChainStatusWatcher } from "src/services/common";
import { sleep } from "src/util/sleep";

export const chainTokensStatuses$ = initializeChainStatusWatcher(
  TOKENS_CACHE_DURATION,
);

const WATCHERS = new Map<ChainId, () => void>();

const fetchPoolAssetTokens = async (chain: Chain, signal: AbortSignal) => {
  if (isAssetHub(chain)) {
    const api = await getApi(chain.id);
    if (signal.aborted) return;

    await api.waitReady;
    if (signal.aborted) return;

    const stop = logger.timer(
      `chain.api.query.PoolAssets.Metadata.getEntries() - ${chain.id}`,
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
          }) as Token,
      );

    const currentTokens = tokensStore$.value;

    const otherTokens = currentTokens.filter(
      (t) => t.chainId !== chain.id || t.type !== "pool-asset",
    );

    const newValue = [...otherTokens, ...assetTokens];

    if (!isEqual(currentTokens, newValue))
      tokensStore$.next([...otherTokens, ...assetTokens].sort(sortTokens));
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
      .map(
        ({ id, assetId, symbol, decimals, name }) =>
          KNOWN_TOKENS_MAP[id] ??
          ({
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
          } as Token),
      );

    const currentTokens = tokensStore$.value;

    const otherTokens = currentTokens.filter(
      (t) => t.chainId !== chain.id || t.type !== "asset",
    );

    const newValue = [...otherTokens, ...assetTokens];

    if (!isEqual(currentTokens, newValue))
      tokensStore$.next([...otherTokens, ...assetTokens].sort(sortTokens));
  }
};

const watchTokensByChain = (chainId: ChainId) => {
  const controller = new AbortController();
  let retryTimeout = 3_000;

  const refresh = async () => {
    const controller2 = new AbortController();
    const abort2 = () => controller2.abort();
    controller.signal.addEventListener("abort", abort2);

    try {
      if (controller.signal.aborted) return;

      chainTokensStatuses$.setLoadingStatus(chainId, "loading");

      const chain = getChainById(chainId);
      if (!chain) throw new Error(`Could not find chain ${chainId}`);

      await Promise.race([
        Promise.all([
          fetchAssetTokens(chain, controller2.signal),
          fetchPoolAssetTokens(chain, controller2.signal),
        ]),
        throwAfter(STORAGE_QUERY_TIMEOUT, "Failed to fetch tokens (timeout)"),
      ]);

      if (!controller.signal.aborted)
        chainTokensStatuses$.setLoadingStatus(chainId, "loaded");
    } catch (err) {
      controller2.abort();
      console.error("Failed to fetch tokens", { chainId, err });
      // wait before retrying to prevent browser from hanging
      await sleep(retryTimeout);
      retryTimeout *= 2; // increase backoff duration
      chainTokensStatuses$.setLoadingStatus(chainId, "stale");
    }

    controller.signal.removeEventListener("abort", abort2);
  };

  const sub = chainTokensStatuses$.subject$
    .pipe(
      map((statusByChain) => statusByChain[chainId]),
      distinctUntilChanged(),
    )
    .subscribe((status) => {
      if (status === "stale") refresh();
    });

  return () => {
    controller.abort();
    sub.unsubscribe();
  };
};

tokensByChainSubscriptions$.subscribe((chainIds) => {
  // add missing watchers
  for (const chainId of chainIds.filter((id) => !WATCHERS.has(id)))
    WATCHERS.set(chainId, watchTokensByChain(chainId));

  // remove watchers that are not needed anymore
  const existingIds = Array.from(WATCHERS.keys());
  const watchersToStop = existingIds.filter((id) => !chainIds.includes(id));
  for (const chainId of watchersToStop) {
    WATCHERS.get(chainId)?.();
    WATCHERS.delete(chainId);
    chainTokensStatuses$.setLoadingStatus(chainId, "stale");
  }
});

export const getTokensWatchersCount = () => WATCHERS.size;
