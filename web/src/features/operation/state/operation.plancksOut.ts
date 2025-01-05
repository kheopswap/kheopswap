import {
	type LoadableState,
	isBigInt,
	loadableData,
	loadableError,
	loadableLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { type Observable, catchError, map, of, switchMap } from "rxjs";
import { getAssetConvertPlancksOut$ } from "./operation.assetConvert";
import { operationDestinationFeeEstimate$ } from "./operationDestinationFeeEstimate";
import { operationInputs$ } from "./operationInputs";

type PlancksOutResult = { plancksOut: bigint | null; lessThan: boolean };

export const [useOperationPlancksOut, operationPlancksOut$] = bind<
	LoadableState<PlancksOutResult>
>(
	operationInputs$.pipe(
		switchMap(
			({
				data: inputs,
				isLoading,
			}): Observable<LoadableState<PlancksOutResult>> => {
				switch (inputs?.type) {
					case "transfer":
						return of(
							loadableData(
								{ plancksOut: inputs.plancksIn, lessThan: false },
								isLoading,
							),
						);

					case "asset-convert": {
						const { tokenIn, tokenOut, plancksIn } = inputs;
						return getAssetConvertPlancksOut$(
							tokenIn?.token,
							tokenOut?.token,
							plancksIn,
						).pipe(
							map((lsPlancksOut) =>
								loadableData(
									{ plancksOut: lsPlancksOut.data ?? null, lessThan: false },
									lsPlancksOut.isLoading || isLoading,
								),
							),
						);
					}

					case "xcm": {
						if (!inputs.plancksIn)
							return of(
								loadableData({ plancksOut: null, lessThan: false }, isLoading),
							);

						return operationDestinationFeeEstimate$.pipe(
							map((opDestFee) => {
								if (opDestFee.error) return loadableError(opDestFee.error);
								if (!opDestFee.data)
									return loadableData(
										{ plancksOut: inputs.plancksIn, lessThan: true },
										isLoading || opDestFee.isLoading,
									);

								// substract dest fee if possible
								if (
									isBigInt(inputs.plancksIn) &&
									opDestFee.data.tokenId === inputs.tokenOut?.token?.id
								) {
									if (opDestFee.data.plancks < inputs.plancksIn)
										return loadableData(
											{
												plancksOut: inputs.plancksIn - opDestFee.data.plancks,
												lessThan: false,
											},
											isLoading,
										);
									//not enough to pay for fee
									return loadableData(
										{ plancksOut: null, lessThan: false },
										isLoading,
									);
								}

								return loadableData(
									{ plancksOut: inputs.plancksIn, lessThan: true },
									isLoading,
								);
							}),
						);
					}

					default:
						return of(
							loadableData({ plancksOut: null, lessThan: false }, false),
						);
				}
			},
		),
		catchError((err) => of(loadableError<PlancksOutResult>(err))),
	),
	loadableLoading(),
);
