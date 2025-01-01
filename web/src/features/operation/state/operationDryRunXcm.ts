import { getApiLoadable$, isApiWithDryRun } from "@kheopswap/papi";
import { loadableData, loadableError } from "@kheopswap/utils";
import { combineLatest, of, switchMap } from "rxjs";
import { getDestinationChain, getXcmMessageFromDryRun } from "src/util";
import { operationDryRun$ } from "./operationDryRun";
import { operationInputs$ } from "./operationInputs";

export const operationDryRunXcm$ = combineLatest([
	operationInputs$,
	operationDryRun$,
]).pipe(
	switchMap(([inputsState, dryRunState]) => {
		const originChainId = inputsState.data?.tokenIn?.token?.chainId;
		if (dryRunState.error || !dryRunState.data || !originChainId)
			return of(loadableData(null, dryRunState.isLoading));

		const xcm = getXcmMessageFromDryRun(dryRunState.data);
		if (!xcm) return of(loadableData(null));

		const destinationChain = getDestinationChain(
			originChainId,
			xcm.destination,
		);
		if (!destinationChain) return of(loadableData(null));

		return getApiLoadable$(destinationChain.id).pipe(
			switchMap((apiState) => {
				if (apiState.error) return of(loadableError(apiState.error));
				const api = apiState.data;
				if (!api || !isApiWithDryRun(api))
					return of(loadableData(null, apiState.isLoading));

				return of(loadableData(null));
			}),
		);
	}),
);
