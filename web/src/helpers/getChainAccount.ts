import { getApi$ } from "@kheopswap/papi";
import type { ChainId, Descriptors } from "@kheopswap/registry";
import {
	type LoadableState,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import {
	type Observable,
	catchError,
	map,
	of,
	startWith,
	switchMap,
} from "rxjs";

export type ChainAccount<Id extends ChainId> =
	Descriptors<Id>["descriptors"]["pallets"]["__storage"]["System"]["Account"]["_type"];

export const [useChainAccount, getChainAccount$] = bind(
	<Id extends ChainId, Res = ChainAccount<Id>>(
		chainId: Id | null | undefined,
		address: string | null | undefined,
	): Observable<LoadableState<Res | null>> => {
		if (!chainId || !address) return of(loadableStateData(null));

		return getApi$(chainId).pipe(
			// tap({
			// 	subscribe: () => {
			// 		console.log("[debug] subscribe getChainAccount$", chainId, address);
			// 	},
			// 	unsubscribe: () => {
			// 		console.log("[debug] unsubscribe getChainAccount$", chainId, address);
			// 	},
			// }),
			switchMap((api) => api.query.System.Account.watchValue(address)),
			map((account) => loadableStateData(account as Res)),
			catchError((cause) =>
				of(
					loadableStateError<Res>(
						new Error("Subscription error for ChainAccount account", { cause }),
					),
				),
			),
			startWith(loadableStateLoading<Res>()),
		);
	},
	//loadableStateLoading(),
	//loadableStateLoading(),
);

// export const ok = bind<
// 	[ChainId | null | undefined, string | null | undefined],
// 	LoadableObsState<ChainAccount<ChainId> | null>
// >((chainId, address) => {
// 	if (!chainId || !address) return of(loadableStateData(null));

// 	return getApi$(chainId).pipe(
// 		tap({
// 			subscribe: () => {
// 				console.log("[debug] subscribe getChainAccount$", chainId, address);
// 			},
// 			unsubscribe: () => {
// 				console.log("[debug] unsubscribe getChainAccount$", chainId, address);
// 			},
// 		}),
// 		switchMap((api) => api.query.System.Account.watchValue(address)),
// 		map((account) => loadableStateData(account)),
// 		catchError((cause) =>
// 			of(
// 				loadableStateError<ChainAccount<ChainId> | null>(
// 					new Error("Subscription error for ChainAccount account", { cause }),
// 				),
// 			),
// 		),
// 	);
// }, loadableStateLoading());

// export const useChainAccount = <Id extends ChainId, Res = ChainAccount<Id>>(
// 	chainId: ChainId | null | undefined,
// 	address: string | null | undefined,
// ): LoadableObsState<Res | null> =>
// 	useStateObservable(
// 		getChainAccount$(chainId, address),
// 	) as LoadableObsState<Res | null>;

// 		new Observable<LoadableObsState<Res | null>>((subscriber) => {
// 			if (!chainId || !address)
// 				return of(loadableStateData(null)).subscribe(subscriber);

// 			subscriber.next(loadableStateLoading());

// 			const unsub = getApi$(chainId)
// 				.pipe(
// 					tap({
// 						subscribe: () => {
// 							console.log(
// 								"[debug] subscribe getChainAccount$",
// 								chainId,
// 								address,
// 							);
// 						},
// 						unsubscribe: () => {
// 							console.log(
// 								"[debug] unsubscribe getChainAccount$",
// 								chainId,
// 								address,
// 							);
// 						},
// 					}),
// 					switchMap((api) => api.query.System.Account.watchValue(address)),
// 				)
// 				.subscribe({
// 					next: (account) => {
// 						subscriber.next(loadableStateData(account as Res));
// 					},
// 					error: (cause) => {
// 						subscriber.next(
// 							loadableStateError(
// 								new Error("Subscription error for ChainAccount account", {
// 									cause,
// 								}),
// 							),
// 						);
// 					},
// 				});

// 			return new Subscription(() => {
// 				console.log(
// 					"[debug] unsubscribe global getChainAccount$",
// 					chainId,
// 					address,
// 				);
// 				unsub.unsubscribe();
// 			});
// 		}),
// );
