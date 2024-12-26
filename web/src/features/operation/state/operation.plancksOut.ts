import {
	type LoadableState,
	loadableStateData,
	loadableStateError,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { type Observable, map, of, switchMap } from "rxjs";
import { getAssetConvertPlancksOut$ } from "./operation.assetConvert";
import { operationDryRun$ } from "./operationDryRun";
import { operationInputs$ } from "./operationInputs";

export const [useOperationPlancksOut, operationPlancksOut$] = bind(
	operationInputs$.pipe(
		switchMap(
			({
				data: inputs,
				isLoading,
			}): Observable<LoadableState<bigint | null>> => {
				switch (inputs?.type) {
					case "transfer":
						// TODO existential deposit checks both sides
						return of(loadableStateData(inputs.plancksIn, isLoading));

					case "asset-convert": {
						const { tokenIn, tokenOut, plancksIn } = inputs;
						return getAssetConvertPlancksOut$(
							tokenIn?.token,
							tokenOut?.token,
							plancksIn,
						);
					}

					case "xcm": {
						if (!inputs.plancksIn)
							return of(loadableStateData(null, isLoading));
						return operationDryRun$.pipe(
							map((dryRunState) => {
								if (dryRunState.error)
									return loadableStateError(dryRunState.error, isLoading);
								if (!dryRunState.data)
									return loadableStateData(
										null,
										isLoading || dryRunState.isLoading,
									);
								return loadableStateData(inputs.plancksIn, isLoading); // TODO substract fee
							}),
						);
					}

					default:
						return of(loadableStateData(null));
				}
			},
		),
	),
);
