import { isEqual } from "lodash";
import { BehaviorSubject, distinctUntilChanged, map, throttleTime } from "rxjs";

import type { TokenId } from "src/config/tokens";

type TokenInfosSubscriptionRequest = {
	id: string;
	tokenIds: TokenId[];
};

// represent the list of tokens that must be watched
const allTokenInfosSubscriptions$ = new BehaviorSubject<
	TokenInfosSubscriptionRequest[]
>([]);

// Unique active subscriptions (1 per token)
export const tokenInfosSubscriptions$ = allTokenInfosSubscriptions$.pipe(
	throttleTime(200, undefined, { leading: true, trailing: true }),
	map((subs) => subs.flatMap(({ tokenIds }) => tokenIds)),
	map((tokenIds) => [...new Set(tokenIds)].sort() as TokenId[]),
	distinctUntilChanged<TokenId[]>(isEqual),
);

export const addTokenInfosSubscription = (tokenIds: TokenId[]) => {
	const request: TokenInfosSubscriptionRequest = {
		id: crypto.randomUUID(),
		tokenIds,
	};

	allTokenInfosSubscriptions$.next([
		...allTokenInfosSubscriptions$.value,
		request,
	]);

	return request.id;
};

export const removeTokenInfosSubscription = (id: string) => {
	allTokenInfosSubscriptions$.next(
		allTokenInfosSubscriptions$.value.filter((sub) => sub.id !== id),
	);
};
