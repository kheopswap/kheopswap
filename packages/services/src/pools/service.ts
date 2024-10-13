import { isEqual } from "lodash";
import { distinctUntilChanged, map, tap } from "rxjs";

import { poolsByChainState$ } from "./state";
import {
	addPoolsByChainSubscription,
	removePoolsByChainSubscription,
} from "./subscriptions";
import type { Pool } from "./types";

import type { ChainId } from "@kheopswap/registry";
import type { LoadingStatus } from "../common";
import { setLoadingStatus } from "./watchers";

type PoolsByChainState = {
	status: LoadingStatus;
	pools: Pool[];
};

const DEFAULT_VALUE: PoolsByChainState = { status: "stale", pools: [] };

export const getPoolsByChain$ = (chainId: ChainId | null) => {
	let subId = "";

	return poolsByChainState$.pipe(
		tap({
			subscribe: () => {
				if (chainId) subId = addPoolsByChainSubscription(chainId);
			},
			unsubscribe: () => {
				if (chainId) removePoolsByChainSubscription(subId);
			},
		}),
		map(
			(statusAndTokens) => statusAndTokens[chainId as ChainId] ?? DEFAULT_VALUE,
		),
		distinctUntilChanged<PoolsByChainState>(isEqual),
	);
};

export const refreshPools = (chainId: ChainId) => {
	setLoadingStatus(chainId, "stale");
};
