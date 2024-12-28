import { getApiLoadable$, isApiWithDryRun } from "@kheopswap/papi";
import { loadableStateData, loadableStateError } from "@kheopswap/utils";
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
			return of(loadableStateData(null, dryRunState.isLoading));

		const xcm = getXcmMessageFromDryRun(dryRunState.data);
		if (!xcm) return of(loadableStateData(null));

		const destinationChain = getDestinationChain(
			originChainId,
			xcm.destination,
		);
		if (!destinationChain) return of(loadableStateData(null));

		return getApiLoadable$(destinationChain.id).pipe(
			switchMap((apiState) => {
				if (apiState.error) return of(loadableStateError(apiState.error));
				const api = apiState.data;
				if (!api || !isApiWithDryRun(api))
					return of(loadableStateData(null, apiState.isLoading));

				return of(loadableStateData(null));
			}),
		);
	}),
);
