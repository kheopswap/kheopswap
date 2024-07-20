import { isEqual } from "lodash";
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs";

import { ChainId } from "src/config/chains";

type TokensByChainSubscriptionRequest = {
  id: string;
  chainId: ChainId;
};

const allTokensByChainSubscriptions$ = new BehaviorSubject<
  TokensByChainSubscriptionRequest[]
>([]);

export const tokensByChainSubscriptions$ = allTokensByChainSubscriptions$.pipe(
  map((subs) => [...new Set(subs.map((sub) => sub.chainId))].sort()),
  distinctUntilChanged<ChainId[]>(isEqual),
);

export const addTokensByChainSubscription = (chainId: ChainId) => {
  const request: TokensByChainSubscriptionRequest = {
    id: crypto.randomUUID(),
    chainId,
  };

  allTokensByChainSubscriptions$.next([
    ...allTokensByChainSubscriptions$.value,
    request,
  ]);

  return request.id;
};

export const removeTokensByChainSubscription = (id: string) => {
  allTokensByChainSubscriptions$.next(
    allTokensByChainSubscriptions$.value.filter((sub) => sub.id !== id),
  );
};
