import {
	type LoadableState,
	isBigInt,
	loadableData,
	loadableError,
	loadableLoading,
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
				return of(loadableError<number | null>(lsInputs.error));
			if (lsInputs.data?.type !== "asset-convert")
				return of(loadableData(null));

			const tokenIdIn = lsInputs.data.tokenIn?.token?.id;
			const tokenIdOut = lsInputs.data.tokenOut?.token?.id;
			const plancksIn = lsInputs.data.plancksIn;

			if (!tokenIdIn || !tokenIdOut || !plancksIn)
				return of(loadableData(null));

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
						return loadableError(lsSwapPlancksOut.error);
					if (lsRawPlancksOut.error)
						return loadableError(lsRawPlancksOut.error);
					if (
						!isBigInt(lsRawPlancksOut.data) ||
						!isBigInt(lsSwapPlancksOut.data?.plancksOut)
					)
						return loadableData(null, isLoading);

					const priceImpact =
						-Number(
							(10000n *
								(lsRawPlancksOut.data - lsSwapPlancksOut.data.plancksOut)) /
								lsRawPlancksOut.data,
						) / 10000;

					return loadableData(priceImpact, isLoading);
				}),
			);
		}),
		catchError((err) => of(loadableError<number | null>(err))),
	),
	loadableLoading(),
);
