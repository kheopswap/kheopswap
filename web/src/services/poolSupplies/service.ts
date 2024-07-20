import { isEqual } from "lodash";
import { distinctUntilChanged, map } from "rxjs";

import {
  addPoolSupplySubscription,
  removePoolSupplySubscription,
} from "./subscriptions";
import { PoolSupplyState } from "./types";
import { getPoolSupplyId } from "./utils";
import { poolSuppliesState$ } from "./state";

import { TokenId, TokenIdsPair } from "src/config/tokens";

const DEFAULT_POOL_SUPPLY_STATE: PoolSupplyState = {
  supply: undefined,
  status: "stale",
};

type PoolSupplyStateWithPair = PoolSupplyState & {
  pair: TokenIdsPair;
};

export const subscribePoolSupplies = (pairs: TokenIdsPair[]) => {
  const subId = addPoolSupplySubscription(pairs);

  return () => {
    removePoolSupplySubscription(subId);
  };
};

export const getPoolSupply$ = (pair: [TokenId, TokenId]) => {
  const poolSupplyId = getPoolSupplyId(pair);
  return poolSuppliesState$.pipe(
    map(
      (poolSupplies): PoolSupplyStateWithPair => ({
        pair,
        ...(poolSupplies[poolSupplyId] ?? DEFAULT_POOL_SUPPLY_STATE),
      }),
    ),
    distinctUntilChanged<PoolSupplyStateWithPair>(isEqual),
  );
};

export const getPoolSupplies$ = (pairs: TokenIdsPair[]) => {
  const poolSupplyIds = pairs.map(getPoolSupplyId);
  return poolSuppliesState$.pipe(
    map((poolSupplies) =>
      poolSupplyIds.map(
        (id, idx): PoolSupplyStateWithPair => ({
          pair: pairs[idx],
          ...(poolSupplies[id] ?? DEFAULT_POOL_SUPPLY_STATE),
        }),
      ),
    ),
    distinctUntilChanged<PoolSupplyStateWithPair[]>(isEqual),
  );
};
