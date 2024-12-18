import { isEqual } from "lodash";
import { distinctUntilChanged, map, tap } from "rxjs";

import { poolSuppliesState$ } from "./state";
import {
	addPoolSupplySubscription,
	removePoolSupplySubscription,
} from "./subscriptions";
import type { PoolSupplyState } from "./types";
import { getPoolSupplyId } from "./utils";

import type { TokenIdsPair } from "@kheopswap/registry";

const DEFAULT_POOL_SUPPLY_STATE: PoolSupplyState = {
	supply: undefined,
	status: "stale",
};

type PoolSupplyStateWithPair = PoolSupplyState & {
	pair: TokenIdsPair;
};

export const getPoolSupplies$ = (pairs: TokenIdsPair[]) => {
	const poolSupplyIds = pairs.map(getPoolSupplyId);

	let subId = "";

	return poolSuppliesState$.pipe(
		tap({
			subscribe: () => {
				if (pairs.length) subId = addPoolSupplySubscription(pairs);
			},
			unsubscribe: () => {
				if (pairs.length) removePoolSupplySubscription(subId);
			},
		}),
		map((poolSupplies) =>
			poolSupplyIds.map(
				(id, idx): PoolSupplyStateWithPair => ({
					pair: pairs[idx] as TokenIdsPair,
					...(poolSupplies[id] ?? DEFAULT_POOL_SUPPLY_STATE),
				}),
			),
		),
		distinctUntilChanged<PoolSupplyStateWithPair[]>(isEqual),
	);
};
