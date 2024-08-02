import { distinctUntilChanged, map, tap } from "rxjs";
import { isEqual } from "lodash";

import { Pool } from "./types";
import { poolsByChainState$ } from "./state";
import {
	addPoolsByChainSubscription,
	removePoolsByChainSubscription,
} from "./subscriptions";

import { ChainId } from "src/config/chains";
import { LoadingStatus } from "src/services/common";

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
