import type { ChainId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { isEqual } from "lodash-es";
import { distinctUntilChanged, map } from "rxjs";
import type { LoadingStatus } from "../common";
import { refreshDirectoryData } from "../directory/service";
import { poolsByChainState$ } from "./state";
import type { Pool } from "./types";

type PoolsByChainState = {
	status: LoadingStatus;
	pools: Pool[];
};

const DEFAULT_VALUE: PoolsByChainState = { status: "stale", pools: [] };

export const getPoolsByChain$ = (chainId: ChainId | null) => {
	return poolsByChainState$.pipe(
		map(
			(statusAndTokens) => statusAndTokens[chainId as ChainId] ?? DEFAULT_VALUE,
		),
		distinctUntilChanged<PoolsByChainState>(isEqual),
	);
};

export const refreshPools = (chainId: ChainId) => {
	// Trigger a refresh of directory data for this chain
	refreshDirectoryData(chainId).catch((err) => {
		logger.warn(`Failed to refresh pools for ${chainId}`, { err });
	});
};
