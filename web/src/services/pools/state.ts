import { groupBy } from "lodash";
import { combineLatest, map } from "rxjs";

import { poolsStore$ } from "./store";
import type { Pool } from "./types";
import { chainPoolsStatuses$ } from "./watchers";

import type { ChainId } from "src/config/chains";
import type { LoadingStatus } from "src/services/common";
import { logger } from "src/util";

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
);
