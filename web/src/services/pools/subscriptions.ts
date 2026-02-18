import { isEqual, uniq } from "lodash-es";
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs";
import type { ChainId } from "../../registry/chains/types";
import { firstThenDebounceTime } from "../../utils/firstThenDebounceTime";

type PoolsByChainSubscriptionRequest = {
	id: string;
	chainId: ChainId;
};

const allPoolsByChainSubscriptions$ = new BehaviorSubject<
	PoolsByChainSubscriptionRequest[]
>([]);

export const poolsByChainSubscriptions$ = allPoolsByChainSubscriptions$.pipe(
	firstThenDebounceTime(100),
	map((subs) => uniq(subs.map((sub) => sub.chainId)).sort()),
	distinctUntilChanged<ChainId[]>(isEqual),
);

export const addPoolsByChainSubscription = (chainId: ChainId) => {
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
