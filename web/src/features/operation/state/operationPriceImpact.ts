import {
	type LoadableState,
	isBigInt,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import {
	type Observable,
	catchError,
	combineLatest,
	map,
	of,
	switchMap,
} from "rxjs";
import { getAssetConvertLoadable$ } from "src/state";
import { operationPlancksOut$ } from "./operation.plancksOut";
import { operationInputs$ } from "./operationInputs";

export const [useOperationPriceImpact, getPriceImpact$] = bind<
	LoadableState<number | null>
>(
	operationInputs$.pipe(
		switchMap((lsInputs): Observable<LoadableState<number | null>> => {
			if (lsInputs.error)
				return of(
					loadableStateError<number | null>(lsInputs.error, lsInputs.isLoading),
				);
			if (lsInputs.data?.type !== "asset-convert")
				return of(loadableStateData(null, lsInputs.isLoading));

			const tokenIdIn = lsInputs.data.tokenIn?.token?.id;
			const tokenIdOut = lsInputs.data.tokenOut?.token?.id;
			const plancksIn = lsInputs.data.plancksIn;

			if (!tokenIdIn || !tokenIdOut || !plancksIn)
				return of(loadableStateData(null, lsInputs.isLoading));

			return combineLatest([
				operationPlancksOut$,
				getAssetConvertLoadable$(tokenIdIn, tokenIdOut, plancksIn),
			]).pipe(
				map(([lsSwapPlancksOut, lsRawPlancksOut]) => {
					const isLoading =
						lsInputs.isLoading ||
						lsSwapPlancksOut.isLoading ||
						lsRawPlancksOut.isLoading;

					//   ratio difference between rawplancksout and swapplancksout
					if (lsSwapPlancksOut.error)
						return loadableStateError(lsSwapPlancksOut.error, isLoading);
					if (lsRawPlancksOut.error)
						return loadableStateError(lsRawPlancksOut.error, isLoading);
					if (
						!isBigInt(lsRawPlancksOut.data) ||
						!isBigInt(lsSwapPlancksOut.data)
					)
						return loadableStateData(null, isLoading);

					const priceImpact =
						-Number(
							(10000n * (lsRawPlancksOut.data - lsSwapPlancksOut.data)) /
								lsRawPlancksOut.data,
						) / 10000;

					return loadableStateData(priceImpact, isLoading);
				}),
			);
		}),
		catchError((err) => of(loadableStateError<number | null>(err))),
	),
	loadableStateLoading(),
);
