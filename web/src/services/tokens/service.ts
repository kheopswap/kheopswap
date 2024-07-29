import { distinctUntilChanged, map, tap } from "rxjs";
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

export const getTokensByChains$ = (chainIds: ChainId[]) => {
  let subId = "";

  return tokensByChainState$.pipe(
    tap({
      subscribe: () => {
        if (chainIds.length) subId = addTokensByChainSubscription(chainIds);
      },
      unsubscribe: () => {
        if (chainIds.length) removeTokensByChainSubscription(subId);
      },
    }),
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
