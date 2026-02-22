import { BehaviorSubject, distinctUntilChanged, map, shareReplay } from "rxjs";
import { getChains } from "../registry/chains/chains";
import type { ChainId } from "../registry/chains/types";
import { getCachedObservable$ } from "../utils/getCachedObservable";
import { logger } from "../utils/logger";
import type { LoadingStatus } from "./common";

/**
 * For services that need to poll/refresh data every x seconds and keep track of the loading status
 * @param label
 * @param refreshTimeout
 * @returns
 */
export const pollChainStatus = (label: string, refreshTimeout: number) => {
	logger.debug(
		"pollChainStatus - %s - (refresh every %dms)",
		label,
		refreshTimeout,
	);

	const key = crypto.randomUUID();

	const statusByChain$ = new BehaviorSubject<Record<ChainId, LoadingStatus>>(
		Object.fromEntries(
			getChains().map((chain) => [chain.id, "stale"]),
		) as Record<ChainId, LoadingStatus>,
	);

	const loadingStatusByChain$ = statusByChain$
		.asObservable()
		.pipe(shareReplay(1));

	const setLoadingStatus = (
		chainId: ChainId | ChainId[],
		status: LoadingStatus,
	) => {
		const stop = logger.cumulativeTimer(`${label}.setLoadingStatus`);
		const chainIds = Array.isArray(chainId) ? chainId : [chainId];

		if (chainIds.some((id) => statusByChain$.value[id] !== status))
			statusByChain$.next({
				...statusByChain$.value,
				...Object.fromEntries(chainIds.map((id) => [id, status])),
			});

		stop();
	};

	const staleWatchCache = new Map<ChainId, ReturnType<typeof setTimeout>>();

	loadingStatusByChain$.subscribe((statusByChain) => {
		for (const key in statusByChain) {
			const chainId = key as ChainId;

			if (
				statusByChain[chainId] === "loaded" &&
				!staleWatchCache.has(chainId)
			) {
				staleWatchCache.set(
					chainId,
					setTimeout(() => {
						if (staleWatchCache.has(chainId)) {
							if (statusByChain[chainId] === "loaded")
								setLoadingStatus(chainId, "stale");
						}
					}, refreshTimeout),
				);
			}

			if (statusByChain[chainId] !== "loaded" && staleWatchCache.has(chainId)) {
				clearTimeout(staleWatchCache.get(chainId));
				staleWatchCache.delete(chainId);
			}
		}
	});

	const getLoadingStatus$ = (chainId: ChainId) => {
		return getCachedObservable$("pollChainStatus", `${key}.${chainId}`, () =>
			loadingStatusByChain$.pipe(
				map((statusByChain) => statusByChain[chainId]),
				distinctUntilChanged(),
				shareReplay({ bufferSize: 1, refCount: true }),
			),
		);
	};

	return {
		setLoadingStatus,
		getLoadingStatus$,
		loadingStatusByChain$,
	};
};
