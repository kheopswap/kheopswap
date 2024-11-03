import { groupBy } from "lodash";
import { combineLatest, map, shareReplay } from "rxjs";

import { poolsStore$ } from "./store";
import type { Pool } from "./types";
import { chainPoolsStatuses$ } from "./watchers";

import type { ChainId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import type { LoadingStatus } from "../common";

const combineState = (
	statusByChain: Record<ChainId, LoadingStatus>,
	allPools: Pool[],
): Record<ChainId, { status: LoadingStatus; pools: Pool[] }> => {
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
	}
};

export const poolsByChainState$ = combineLatest([
	chainPoolsStatuses$,
	poolsStore$,
]).pipe(
	map(([statusByChain, allPools]) => combineState(statusByChain, allPools)),
	shareReplay(1),
);
