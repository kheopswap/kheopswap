import { type Api, getApiLoadable$ } from "@kheopswap/papi";
import type { ChainId } from "@kheopswap/registry";
import {
	type LoadableState,
	getCachedObservable$,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
} from "@kheopswap/utils";
import {
	type Observable,
	catchError,
	distinctUntilChanged,
	distinctUntilKeyChanged,
	map,
	of,
	shareReplay,
	startWith,
	switchMap,
} from "rxjs";

export const getApiEachBlock$ = <
	Id extends ChainId,
	ChainApi = Api<Id>,
	Res = Observable<LoadableState<ChainApi>>,
>(
	chainId: ChainId,
): Res => {
	return getCachedObservable$(
		"getApiEachBlock$",
		chainId,
		() =>
			getApiLoadable$(chainId).pipe(
				distinctUntilKeyChanged("data", (a, b) => a?.chainId === b?.chainId),
				switchMap(({ data: api, isLoading, error }) => {
					if (error) return of(loadableStateError<ChainApi>(error));
					if (!api && !isLoading)
						return of(
							loadableStateError<ChainApi>(
								new Error(`Api not found - ${chainId}`),
							),
						);
					if (!api) return of(loadableStateLoading<ChainApi>());
					return api.query.System.Number.watchValue("best").pipe(
						distinctUntilChanged<number>(),
						map(() => loadableStateData<ChainApi>(api as ChainApi)),
						catchError((error) => of(loadableStateError<ChainApi>(error))),
					);
				}),
				startWith(loadableStateLoading<ChainApi>()),
				shareReplay({ bufferSize: 1, refCount: true }),
			) as Res,
	);
};
