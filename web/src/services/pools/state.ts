import { combineLatest, map, shareReplay } from "rxjs";
import type { ChainId } from "../../registry/chains/types";
import { logger } from "../../utils/logger";
import type { LoadingStatus } from "../common";
import type { PoolsStoreData } from "./store";
import { poolsStore$ } from "./store";
import type { Pool } from "./types";
import { chainPoolsStatuses$ } from "./watchers";

const combineState = (
	statusByChain: Record<ChainId, LoadingStatus>,
	poolsByChain: PoolsStoreData,
): Record<ChainId, { status: LoadingStatus; pools: Pool[] }> => {
	const stop = logger.cumulativeTimer("pools.combineState");

	try {
		return Object.fromEntries(
			Object.entries(statusByChain).map(([chainId, status]) => [
				chainId,
				{
					status,
					pools: poolsByChain[chainId as ChainId] ?? [],
				},
			]),
		) as Record<ChainId, { status: LoadingStatus; pools: Pool[] }>;
	} catch (err) {
		logger.error("Failed to merge pools state", { err });
		return {} as Record<ChainId, { status: LoadingStatus; pools: Pool[] }>;
	} finally {
		stop();
	}
};

export const poolsByChainState$ = combineLatest([
	chainPoolsStatuses$,
	poolsStore$,
]).pipe(
	map(([statusByChain, poolsByChain]) =>
		combineState(statusByChain, poolsByChain),
	),
	shareReplay(1),
);
