import {
	type LoadableState,
	isBigInt,
	loadableStateData,
	loadableStateError,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { type Observable, map, of, switchMap } from "rxjs";
import { getAssetConvertPlancksOut$ } from "./operation.assetConvert";
import { operationDestinationFeeEstimate$ } from "./operationDestinationFeeEstimate";
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

						return operationDestinationFeeEstimate$.pipe(
							map((opDestFee) => {
								if (opDestFee.error)
									return loadableStateError(opDestFee.error, isLoading); // TODO FIX
								if (!opDestFee.data)
									return loadableStateData(
										null,
										isLoading || opDestFee.isLoading,
									);

								// substract dest fee if possible
								if (
									isBigInt(inputs.plancksIn) &&
									opDestFee.data.tokenId === inputs.tokenOut?.token?.id
								) {
									// TODO check if after dest fees are paid, there is enough for existential deposit

									if (opDestFee.data.plancks < inputs.plancksIn)
										return loadableStateData(
											inputs.plancksIn - opDestFee.data.plancks,
											isLoading,
										);
									//not enough to pay for fee
									return loadableStateData(null, isLoading);
								}

								return loadableStateData(inputs.plancksIn, isLoading);
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
