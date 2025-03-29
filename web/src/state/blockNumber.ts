// import { type Api, getApiLoadable$ } from "@kheopswap/papi";
// import type { ChainId } from "@kheopswap/registry";
// import {
// 	type LoadableState,
// 	loadableStateData,
// 	loadableStateError,
// 	loadableStateLoading,
// } from "@kheopswap/utils";
// import { bind } from "@react-rxjs/core";
// import {
// 	type Observable,
// 	catchError,
// 	distinctUntilChanged,
// 	distinctUntilKeyChanged,
// 	map,
// 	of,
// 	switchMap,
// 	tap,
// } from "rxjs";

// type ApiWithBlockNumber<Id extends ChainId> = [Api<Id>, number];

// export const [useApiEachBlock, getApiEachBlock$] = bind(
// 	<
// 		Id extends ChainId,
// 		ChainApiWithBlockNumber = ApiWithBlockNumber<Id>,
// 		Res = Observable<LoadableState<ChainApiWithBlockNumber>>,
// 	>(
// 		chainId: ChainId,
// 	): Res =>
// 		getApiLoadable$(chainId).pipe(
// 			distinctUntilKeyChanged("data", (a, b) => a?.chainId === b?.chainId),
// 			switchMap(({ data: api, isLoading, error }) => {
// 				if (error)
// 					return of(loadableStateError<ChainApiWithBlockNumber>(error));
// 				if (!api && !isLoading)
// 					return of(
// 						loadableStateError<ChainApiWithBlockNumber>(
// 							new Error(`Api not found - ${chainId}`),
// 						),
// 					);
// 				if (!api) return of(loadableStateLoading<ChainApiWithBlockNumber>());
// 				return api.query.System.Number.watchValue("best").pipe(
// 					distinctUntilChanged<number>(),
// 					map((blockNumber) =>
// 						loadableStateData<ChainApiWithBlockNumber>([
// 							api,
// 							blockNumber,
// 						] as ChainApiWithBlockNumber),
// 					),
// 					catchError((error) =>
// 						of(loadableStateError<ChainApiWithBlockNumber>(error)),
// 					),
// 				);
// 			}),
// 			tap({
// 				next: (v) => console.log("[getApiEachBlock$] next", v),
// 				subscribe: () => console.log("[getApiEachBlock$] subscribed", chainId),
// 				unsubscribe: () =>
// 					console.log("[getApiEachBlock$] unsubscribed", chainId),
// 			}),
// 		) as Res,
// 	loadableStateLoading<ApiWithBlockNumber<ChainId>>(),
// );

// export const [useBlockNumber, getBlockNumber$] = bind(
// 	(chainId: ChainId) => {
// 		return getApiLoadable$(chainId).pipe(
// 			switchMap(({ data: api, isLoading, error }) => {
// 				if (error) return of(loadableStateError<number>(error));
// 				if (!api && !isLoading)
// 					return of(
// 						loadableStateError<number>(new Error(`Api not found - ${chainId}`)),
// 					);
// 				if (!api) return of(loadableStateLoading<number>());
// 				return api.query.System.Number.watchValue("best").pipe(
// 					distinctUntilChanged<number>(),
// 					map((blockNumber) => loadableStateData<number>(blockNumber)),
// 				);
// 			}),
// 			catchError((error) => of(loadableStateError<number>(error))),
// 		);
// 	},
// 	() => loadableStateLoading<number>(),
// );
