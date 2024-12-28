import { type Api, getApiLoadable$ } from "@kheopswap/papi";
import type { ChainId } from "@kheopswap/registry";
import {
	type LoadableState,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { type Observable, catchError, map, of, switchMap } from "rxjs";

export const [useBlockNumber, getBlockNumber$] = bind(
	(chainId: ChainId) => {
		return getApiLoadable$(chainId).pipe(
			switchMap(({ data: api, isLoading, error }) => {
				if (error) return of(loadableStateError<number>(error));
				if (!api && !isLoading)
					return of(
						loadableStateError<number>(new Error(`Api not found - ${chainId}`)),
					);
				if (!api) return of(loadableStateLoading<number>());
				return api.query.System.Number.watchValue("best").pipe(
					map((blockNumber) => loadableStateData(blockNumber)),
					catchError((error) => of(loadableStateError<number>(error))),
				);
			}),
		);
	},
	() => loadableStateLoading<number>(),
);

export const getApiEachBlock$ = <
	Id extends ChainId,
	ChainApi = Api<Id>,
	Res = Observable<LoadableState<ChainApi>>,
>(
	chainId: ChainId,
): Res => {
	return getApiLoadable$(chainId).pipe(
		switchMap(({ data: api, isLoading, error }) => {
			if (error) return of(loadableStateError<ChainApi>(error));
			if (!api && !isLoading)
				return of(
					loadableStateError<ChainApi>(new Error(`Api not found - ${chainId}`)),
				);
			if (!api) return of(loadableStateLoading<ChainApi>());
			return api.query.System.Number.watchValue("best").pipe(
				map(() => loadableStateData<ChainApi>(api as ChainApi)),
				catchError((error) => of(loadableStateError<ChainApi>(error))),
			);
		}),
	) as Res;

	// return getBlockNumber$(chainId).pipe(
	//     switchMap(() => getApiLoadable$(chainId)),
	// );
};
