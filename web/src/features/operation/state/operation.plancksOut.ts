import {
	type LoadableState,
	isBigInt,
	loadableData,
	loadableError,
	lodableLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { type Observable, catchError, map, of, switchMap } from "rxjs";
import { getAssetConvertPlancksOut$ } from "./operation.assetConvert";
import { operationDestinationFeeEstimate$ } from "./operationDestinationFeeEstimate";
import { operationInputs$ } from "./operationInputs";

export const [useOperationPlancksOut, operationPlancksOut$] = bind<
	LoadableState<bigint | null>
>(
	operationInputs$.pipe(
		switchMap(
			({
				data: inputs,
				isLoading,
			}): Observable<LoadableState<bigint | null>> => {
				switch (inputs?.type) {
					case "transfer":
						return of(loadableData(inputs.plancksIn, isLoading));

					case "asset-convert": {
						const { tokenIn, tokenOut, plancksIn } = inputs;
						return getAssetConvertPlancksOut$(
							tokenIn?.token,
							tokenOut?.token,
							plancksIn,
						);
					}

					case "xcm": {
						if (!inputs.plancksIn) return of(loadableData(null, isLoading));

						return operationDestinationFeeEstimate$.pipe(
							map((opDestFee) => {
								if (opDestFee.error) return loadableError(opDestFee.error);
								if (!opDestFee.data)
									return loadableData(null, isLoading || opDestFee.isLoading);

								// substract dest fee if possible
								if (
									isBigInt(inputs.plancksIn) &&
									opDestFee.data.tokenId === inputs.tokenOut?.token?.id
								) {
									if (opDestFee.data.plancks < inputs.plancksIn)
										return loadableData(
											inputs.plancksIn - opDestFee.data.plancks,
											isLoading,
										);
									//not enough to pay for fee
									return loadableData(null, isLoading);
								}

								return loadableData(inputs.plancksIn, isLoading);
							}),
						);
					}

					default:
						return of(loadableData(null));
				}
			},
		),
		catchError((err) => of(loadableError<bigint | null>(err))),
	),
	lodableLoading(),
);
