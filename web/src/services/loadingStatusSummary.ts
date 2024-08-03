import { isEqual, values } from "lodash";
import { combineLatest, distinctUntilChanged, map } from "rxjs";

import { balanceStatuses$ } from "./balances/watchers";
import type { LoadingStatus } from "./common";
import { poolSuppliesStatuses$ } from "./poolSupplies/watchers";
import { chainPoolsStatuses$ } from "./pools/watchers";
import { chainTokensStatuses$ } from "./tokens/watchers";

type LoadingStatusSummary = {
	loading: number;
	loaded: number;
	total: number;
};

const getSummary = (statusMap: Record<string, LoadingStatus>) => {
	let [loading, loaded] = [0, 0];

	for (const status of values(statusMap))
		if (status === "loading") loading++;
		else if (status === "loaded") loaded++;

	return { loading, loaded, total: loading + loaded };
};

export const loadingStatusSummary$ = combineLatest([
	balanceStatuses$.pipe(map(getSummary)),
	chainPoolsStatuses$.pipe(map(getSummary)),
	poolSuppliesStatuses$.pipe(map(getSummary)),
	chainTokensStatuses$.pipe(map(getSummary)),
]).pipe(
	map((statusMaps) => {
		const { loading, loaded } = statusMaps.reduce(
			(acc, statusMap) => {
				acc.loading += statusMap.loading;
				acc.loaded += statusMap.loaded;
				return acc;
			},
			{ loading: 0, loaded: 0 },
		);
		return { loading, loaded, total: loading + loaded };
	}),
	distinctUntilChanged<LoadingStatusSummary>(isEqual),
);
