import { distinctUntilChanged, map } from "rxjs";
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

export const subscribePoolsByChain = (chainId: ChainId) => {
  const subId = addPoolsByChainSubscription(chainId);

  return () => removePoolsByChainSubscription(subId);
};

export const getPoolsByChain$ = (chainId: ChainId | null) => {
  return poolsByChainState$.pipe(
    map(
      (statusAndTokens) => statusAndTokens[chainId as ChainId] ?? DEFAULT_VALUE,
    ),
    distinctUntilChanged<PoolsByChainState>(isEqual),
  );
};
