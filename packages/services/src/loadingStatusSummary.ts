import { isEqual, values } from "lodash-es";
import { combineLatest, distinctUntilChanged, map, throttleTime } from "rxjs";

import { balanceStatuses$ } from "./balances/watchers";
import type { LoadingStatus } from "./common";
import { directoryPoolsStatusByChain$ } from "./directory/poolsStore";
import { directoryTokensStatusByChain$ } from "./directory/tokensStore";
import { poolSuppliesStatuses$ } from "./poolSupplies/watchers";
import { tokenInfosStatuses$ } from "./tokenInfos/watchers";

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
	directoryPoolsStatusByChain$.pipe(map(getSummary)),
	poolSuppliesStatuses$.pipe(map(getSummary)),
	directoryTokensStatusByChain$.pipe(map(getSummary)),
	tokenInfosStatuses$.pipe(map(getSummary)),
]).pipe(
	throttleTime(100, undefined, { leading: true, trailing: true }),
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
