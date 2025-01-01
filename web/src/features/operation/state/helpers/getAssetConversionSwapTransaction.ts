import { APP_FEE_ADDRESS } from "@kheopswap/constants";
import { type Api, getApiLoadable$, isApiAssetHub } from "@kheopswap/papi";
import {
	type ChainId,
	type Token,
	getXcmV3MultilocationFromTokenId,
	isChainIdAssetHub,
} from "@kheopswap/registry";
import { getSetting$ } from "@kheopswap/settings";
import {
	type LoadableState,
	isBigInt,
	loadableData,
	loadableError,
	lodableLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import {
	type Observable,
	catchError,
	combineLatest,
	map,
	of,
	startWith,
	switchMap,
} from "rxjs";
import type { AnyTransaction } from "src/types";
import { getAssetConvertOutput$ } from "../operation.assetConvert";
import type { OperationInputs } from "../operationInputs";
import { getMinPlancksOut } from "./getMinPlancksOut";
import { getSwapAppFee$ } from "./getSwapAppFee";
import { getTransferTxCall } from "./getTransferTransaction";

type SwapParams = {
	swapPlancksIn: bigint;
	minPlancksOut: bigint;
	appFee: bigint;
	poolFee: bigint;
};

export const [useAssetConversionSwapParams, getAssetConversionSwapParams$] =
	bind(
		(
			inputs: OperationInputs | null | undefined,
		): Observable<LoadableState<SwapParams | null>> => {
			if (inputs?.type !== "asset-convert")
				return of(loadableData<SwapParams | null>(null)); //throw new Error("Invalid operation type");

			const { tokenIn, tokenOut, recipient, plancksIn } = inputs;

			if (
				!tokenIn?.token?.id ||
				!tokenOut?.token?.id ||
				!isChainIdAssetHub(tokenIn.token.chainId) ||
				!recipient ||
				!isBigInt(plancksIn)
			)
				return of(loadableData<SwapParams | null>(null));

			return combineLatest([
				getSwapAppFee$(tokenIn.token, plancksIn),
				getSetting$("slippage"),
			]).pipe(
				switchMap(([appFee, slippage]) => {
					const swapPlancksIn = plancksIn - (appFee.data ?? 0n);

					return getAssetConvertOutput$(
						tokenIn.token,
						tokenOut.token,
						swapPlancksIn,
					).pipe(
						map((output): LoadableState<SwapParams | null> => {
							const isLoading = appFee.isLoading || output.isLoading;

							if (output.error) throw output.error;
							if (!isBigInt(output.data?.plancksOut))
								return loadableData(null, isLoading);

							const minPlancksOut = isBigInt(output.data?.plancksOut)
								? getMinPlancksOut(output.data.plancksOut, slippage)
								: null;

							if (!isBigInt(minPlancksOut))
								return loadableData(null, isLoading);

							return loadableData(
								{
									swapPlancksIn,
									minPlancksOut,
									appFee: appFee.data ?? 0n,
									poolFee: output.data.poolFee,
								},
								isLoading,
							);
						}),
					);
				}),
				startWith(lodableLoading<SwapParams | null>()),
				catchError((error) => of(loadableError<SwapParams | null>(error))),
			);
		},
		() => lodableLoading<SwapParams | null>(),
	);

export const getAssetConversionSwapTransaction$ = (
	inputs: OperationInputs,
): Observable<LoadableState<AnyTransaction | null>> => {
	return getAssetConversionSwapParams$(inputs).pipe(
		switchMap((lsParams) => {
			if (!lsParams.data || !inputs.tokenIn?.token?.chainId)
				return of(loadableData(null, lsParams.isLoading));

			const { tokenIn, tokenOut, plancksIn, recipient } = inputs;
			const { minPlancksOut, appFee } = lsParams.data;

			if (
				//!account ||
				!tokenIn?.token?.id ||
				!tokenOut?.token?.id ||
				!isChainIdAssetHub(tokenIn.token.chainId) ||
				!recipient ||
				!isBigInt(plancksIn)
			)
				return of(loadableData(null, lsParams.isLoading));

			return getApiLoadable$(tokenIn.token.chainId).pipe(
				map((lsApi) => {
					if (!lsApi.data || !tokenIn.token || !tokenOut.token)
						return loadableData(null, lsParams.isLoading);

					const appFeeTransferTx = appFee
						? getTransferTxCall(
								lsApi.data,
								tokenIn.token,
								appFee,
								APP_FEE_ADDRESS,
							)
						: null;

					const swapTx = getAssetConversionSwapTxCall(
						lsApi.data,
						tokenIn.token,
						tokenOut.token,
						plancksIn - appFee,
						minPlancksOut,
						recipient,
					);

					const tx = appFeeTransferTx
						? lsApi.data.tx.Utility.batch_all({
								calls: [swapTx.decodedCall, appFeeTransferTx.decodedCall],
							})
						: swapTx;

					return loadableData(tx, lsParams.isLoading);
				}),
			);
		}),
		catchError((error) => of(loadableError<AnyTransaction>(error))),
		startWith(lodableLoading<AnyTransaction>()),
	);
};

const getAssetConversionSwapTxCall = (
	api: Api<ChainId>,
	tokenIn: Token,
	tokenOut: Token,
	plancksIn: bigint,
	minPlancksOut: bigint,
	dest: string,
): AnyTransaction => {
	if (!isApiAssetHub(api)) throw new Error("Chain is not an asset hub");

	return api.tx.AssetConversion.swap_exact_tokens_for_tokens({
		path: [
			getXcmV3MultilocationFromTokenId(tokenIn.id),
			getXcmV3MultilocationFromTokenId(tokenOut.id),
		],
		amount_in: plancksIn,
		amount_out_min: minPlancksOut,
		send_to: dest,
		keep_alive: tokenIn.type === "native",
	});
};
