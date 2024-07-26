import { distinctUntilChanged, map } from "rxjs";
import { Dictionary, isEqual } from "lodash";

import { tokensByChainState$ } from "./state";
import {
  addTokensByChainSubscription,
  removeTokensByChainSubscription,
} from "./subscriptions";

import { ChainId } from "src/config/chains";
import { Token } from "src/config/tokens";
import { LoadingStatus } from "src/services/common";

type TokensByChainState = {
  status: LoadingStatus;
  tokens: Token[];
};

const DEFAULT_VALUE: TokensByChainState = { status: "stale", tokens: [] };

export const subscribeTokensByChains = (chainIds: ChainId[]) => {
  const subId = addTokensByChainSubscription(chainIds);

  return () => removeTokensByChainSubscription(subId);
};

export const getTokensByChains$ = (chainIds: ChainId[]) => {
  return tokensByChainState$.pipe(
    map((statusAndTokens) =>
      Object.fromEntries(
        chainIds.map((chainId) => [
          chainId,
          statusAndTokens[chainId] ?? DEFAULT_VALUE,
        ]),
      ),
    ),
    distinctUntilChanged<Dictionary<TokensByChainState>>(isEqual),
  );
};
