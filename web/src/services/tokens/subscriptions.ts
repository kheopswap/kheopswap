import { isEqual } from "lodash";
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs";

import { ChainId } from "src/config/chains";

type TokensByChainSubscriptionRequest = {
  id: string;
  chainIds: ChainId[];
};

const allTokensByChainSubscriptions$ = new BehaviorSubject<
  TokensByChainSubscriptionRequest[]
>([]);

export const tokensByChainSubscriptions$ = allTokensByChainSubscriptions$.pipe(
  map((subs) => [...new Set(subs.flatMap((sub) => sub.chainIds))].sort()),
  distinctUntilChanged<ChainId[]>(isEqual),
);

export const addTokensByChainSubscription = (chainIds: ChainId[]) => {
  const request: TokensByChainSubscriptionRequest = {
    id: crypto.randomUUID(),
    chainIds,
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
