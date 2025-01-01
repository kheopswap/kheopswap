import type { ChainId } from "@kheopswap/registry";
import {
	type LoadableState,
	loadableData,
	loadableError,
} from "@kheopswap/utils";
import { type Observable, combineLatest, of, switchMap } from "rxjs";
import { getDryRunCall$ } from "src/state/dryRunCall";
import type { DryRun } from "src/util";
import { operationInputs$ } from "./operationInputs";
import { operationTransaction$ } from "./operationTransaction";

export const operationDryRun$ = combineLatest([
	operationInputs$,
	operationTransaction$,
]).pipe(
	switchMap(
		([{ data: inputs, isLoading }, transaction]): Observable<
			LoadableState<DryRun<ChainId> | null>
		> => {
			if (transaction.error)
				return of(loadableError<DryRun<ChainId> | null>(transaction.error));
			if (!transaction.data)
				return of(loadableData(null, isLoading || transaction.isLoading));
			if (!inputs?.tokenIn?.token?.chainId || !inputs.account?.address)
				return of(loadableData(null, isLoading));
			return getDryRunCall$(
				inputs.tokenIn.token.chainId,
				inputs.account.address,
				transaction.data.decodedCall,
			);
		},
	),
);
