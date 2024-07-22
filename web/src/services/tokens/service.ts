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

// export const getTokensByChain$ = (chainId: ChainId | null) => {
//   console.log("getTokenByChin", chainId);
//   return tokensByChainState$.pipe(
//     map((statusAndTokens) => {
//       console.log({ chainId, statusAndTokens });
//       return statusAndTokens[chainId as ChainId] ?? DEFAULT_VALUE;
//     }),
//     distinctUntilChanged<TokensByChainState>(isEqual),
//   );
// };

export const getTokensByChains$ = (chainIds: ChainId[]) => {
  // const key = crypto.randomUUID();
  // console.log("hey getTokensByChains", chainIds, key);
  //let count = 0;
  return tokensByChainState$.pipe(
    // tap({
    //   subscribe: () => {
    //     count++;
    //     console.log("hey subscribe", chainIds, key, count);
    //   },
    //   unsubscribe: () => {
    //     count--;
    //     console.log("hey unsubscribe", chainIds, key, count);
    //   },
    // }),
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
