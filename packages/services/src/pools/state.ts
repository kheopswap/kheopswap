import type { ChainId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { groupBy } from "lodash-es";
import { combineLatest, map, shareReplay } from "rxjs";
import type { LoadingStatus } from "../common";
import {
	directoryPoolsStatusByChain$,
	directoryPoolsStore$,
} from "../directory/poolsStore";
import type { Pool } from "./types";

const combineState = (
	statusByChain: Record<ChainId, LoadingStatus>,
	allPools: Pool[],
): Record<ChainId, { status: LoadingStatus; pools: Pool[] }> => {
	const stop = logger.cumulativeTimer("pools.combineState");

	try {
		const poolsByChain = groupBy(allPools, "chainId");

		return Object.fromEntries(
			Object.entries(statusByChain).map(([chainId, status]) => [
				chainId,
				{
					status,
					pools: poolsByChain[chainId] ?? [],
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
	directoryPoolsStatusByChain$,
	directoryPoolsStore$,
]).pipe(
	map(([statusByChain, allPools]) => combineState(statusByChain, allPools)),
	shareReplay(1),
);
