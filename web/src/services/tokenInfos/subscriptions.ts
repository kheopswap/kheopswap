import { isEqual, uniq } from "lodash-es";
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs";
import type { TokenId } from "../../registry/tokens/types";
import { firstThenDebounceTime } from "../../utils/firstThenDebounceTime";

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
	firstThenDebounceTime(100),
	map((subs) => subs.flatMap(({ tokenIds }) => tokenIds)),
	map((tokenIds) => uniq(tokenIds).sort() as TokenId[]),
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
