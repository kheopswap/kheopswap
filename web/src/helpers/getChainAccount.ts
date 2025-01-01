import { getApi$ } from "@kheopswap/papi";
import type { ChainId, Descriptors } from "@kheopswap/registry";
import {
	type LoadableState,
	loadableData,
	loadableError,
	lodableLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { type Observable, catchError, map, of, switchMap } from "rxjs";

export type ChainAccount<Id extends ChainId> =
	Descriptors<Id>["descriptors"]["pallets"]["__storage"]["System"]["Account"]["_type"];

export const [useChainAccount, getChainAccount$] = bind(
	<Id extends ChainId, Res = ChainAccount<Id>>(
		chainId: Id | null | undefined,
		address: string | null | undefined,
	): Observable<LoadableState<Res | null>> => {
		if (!chainId || !address) return of(loadableData(null));

		return getApi$(chainId).pipe(
			switchMap((api) => api.query.System.Account.watchValue(address)),
			map((account) => loadableData(account as Res)),
			catchError((cause) =>
				of(
					loadableError<Res>(
						new Error("Subscription error for ChainAccount account", { cause }),
					),
				),
			),
		);
	},
	lodableLoading<ChainAccount<ChainId>>(),
);
