import { getApiLoadable$ } from "@kheopswap/papi";
import { type ChainId, isChainIdWithDryRun } from "@kheopswap/registry";
import {
	type LoadableState,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
} from "@kheopswap/utils";
import {
	type Observable,
	catchError,
	combineLatest,
	of,
	startWith,
	switchMap,
} from "rxjs";
import type { AnyTransaction } from "src/types";
import { type DryRun, getDryRun } from "src/util";
import { operationInputs$ } from "./operationInputs";
import { operationTransaction$ } from "./operationTransaction";

// TODO update each block
const getDryRun$ = <Id extends ChainId, Res = DryRun<ChainId> | null>(
	chainId: Id,
	from: string,
	call: AnyTransaction,
): Observable<LoadableState<Res>> => {
	return getApiLoadable$(chainId).pipe(
		switchMap(async (apiState) => {
			if (!isChainIdWithDryRun(chainId))
				return loadableStateData<Res>(null as Res);
			if (apiState.error) return loadableStateError<Res>(apiState.error);
			if (!apiState.data) return loadableStateLoading<Res>();

			const res = (await getDryRun(apiState.data, from, call)) as Res;
			return loadableStateData(res);
		}),
		startWith(loadableStateLoading<Res>()),
		catchError((error) => of(loadableStateError<Res>(error))),
	);
};

export const operationDryRun$ = combineLatest([
	operationInputs$,
	operationTransaction$,
]).pipe(
	switchMap(
		([{ data: inputs, isLoading }, transaction]): Observable<
			LoadableState<DryRun<ChainId> | null>
		> => {
			if (transaction.error)
				return of(
					loadableStateError<DryRun<ChainId> | null>(
						transaction.error,
						isLoading,
					),
				);
			if (!transaction.data)
				return of(loadableStateData(null, isLoading || transaction.isLoading));
			if (!inputs?.tokenIn?.token?.chainId || !inputs.account?.address)
				return of(loadableStateData(null, isLoading));
			return getDryRun$(
				inputs.tokenIn.token.chainId,
				inputs.account.address,
				transaction.data,
			);
		},
	),
);
