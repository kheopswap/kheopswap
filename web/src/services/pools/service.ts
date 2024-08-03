import { isEqual } from "lodash";
import { distinctUntilChanged, map, tap } from "rxjs";

import { poolsByChainState$ } from "./state";
import {
	addPoolsByChainSubscription,
	removePoolsByChainSubscription,
} from "./subscriptions";
import type { Pool } from "./types";

import type { ChainId } from "src/config/chains";
import type { LoadingStatus } from "src/services/common";

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
