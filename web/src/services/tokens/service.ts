import { distinctUntilChanged, map } from "rxjs";
import { isEqual } from "lodash";

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

export const subscribeTokensByChain = (chainId: ChainId) => {
  addTokensByChainSubscription(chainId);

  return () => removeTokensByChainSubscription(chainId);
};

export const getTokensByChain$ = (chainId: ChainId | null) => {
  return tokensByChainState$.pipe(
    map(
      (statusAndTokens) => statusAndTokens[chainId as ChainId] ?? DEFAULT_VALUE,
    ),
    distinctUntilChanged<TokensByChainState>(isEqual),
  );
};
