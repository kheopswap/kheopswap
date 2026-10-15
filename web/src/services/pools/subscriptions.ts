import { isEqual, uniq } from "lodash-es";
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs";
import type { ChainIdAssetHub } from "../../registry/chains/types";
import { firstThenDebounceTime } from "../../utils/firstThenDebounceTime";

type PoolsByChainSubscriptionRequest = {
	id: string;
	chainId: ChainIdAssetHub;
};

const allPoolsByChainSubscriptions$ = new BehaviorSubject<
	PoolsByChainSubscriptionRequest[]
>([]);

export const poolsByChainSubscriptions$ = allPoolsByChainSubscriptions$.pipe(
	firstThenDebounceTime(100),
	map((subs) => uniq(subs.map((sub) => sub.chainId)).sort()),
	distinctUntilChanged<ChainIdAssetHub[]>(isEqual),
);

export const addPoolsByChainSubscription = (chainId: ChainIdAssetHub) => {
	const request: PoolsByChainSubscriptionRequest = {
		id: crypto.randomUUID(),
		chainId,
	};

	allPoolsByChainSubscriptions$.next([
		...allPoolsByChainSubscriptions$.value,
		request,
	]);

	return request.id;
};

export const removePoolsByChainSubscription = (id: string) => {
	allPoolsByChainSubscriptions$.next(
		allPoolsByChainSubscriptions$.value.filter((sub) => sub.id !== id),
	);
};
