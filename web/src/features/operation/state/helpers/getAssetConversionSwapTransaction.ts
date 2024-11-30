import {
	type Api,
	getApi,
	getApi$,
	getApiLoadable$,
	isApiAssetHub,
} from "@kheopswap/papi";
import {
	type ChainId,
	type Token,
	TokenId,
	getXcmV3MultilocationFromTokenId,
	isChainIdAssetHub,
} from "@kheopswap/registry";
import { getSetting$ } from "@kheopswap/settings";
import {
	type LoadableObsState,
	isBigInt,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
	logger,
} from "@kheopswap/utils";
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
import type { OperationInputs } from "../inputs.state";
import { getAssetConvertOutput$ } from "../operation.assetConvert";
import { getMinPlancksOut } from "./getMinPlancksOut";
import { getSwapAppFee$ } from "./getSwapAppFee";
import {
	getTransferTransaction$,
	getTransferTxCall,
} from "./getTransferTransaction";

export const getAssetConversionSwapTransaction$ = (
	inputs: OperationInputs,
): Observable<LoadableObsState<AnyTransaction | null>> => {
	if (inputs.type !== "asset-convert") of(loadableStateData(null)); //throw new Error("Invalid operation type");
	logger.debug("getAssetConversionSwapTransaction", { inputs });

	const { account, tokenIn, tokenOut, recipient, plancksIn } = inputs;

	if (
		!account ||
		!tokenIn?.token?.id ||
		!tokenOut?.token?.id ||
		!isChainIdAssetHub(tokenIn.token.chainId) ||
		!recipient ||
		!isBigInt(plancksIn)
	)
		return of(loadableStateData(null));

	return combineLatest([
		getApi$(tokenIn.token.chainId),
		getSwapAppFee$(tokenIn.token, plancksIn),
		getSetting$("slippage"),
	]).pipe(
		switchMap(([api, appFee, slippage]) => {
			// ts hack to avoid null assertion which has already been checked
			if (!tokenIn.token || !tokenOut.token) throw new Error("Token not found");

			const appFeeTransferTx = isBigInt(appFee.data)
				? getTransferTxCall(api, tokenIn.token, appFee.data, recipient)
				: null;

			return getAssetConvertOutput$(
				tokenIn.token,
				tokenOut.token,
				plancksIn - (appFee.data ?? 0n),
			).pipe(
				map((output) => {
					// ts hack to avoid null assertion which has already been checked
					if (!tokenIn.token || !tokenOut.token)
						throw new Error("Token not found");

					const isLoading = appFee.isLoading || output.isLoading;

					if (output.error) throw output.error;
					if (!isBigInt(output.data)) return [null, isLoading] as const;

					const minPlancksOut = isBigInt(output.data?.plancksOut)
						? getMinPlancksOut(output.data.plancksOut, slippage)
						: null;

					if (!isBigInt(minPlancksOut)) return [null, isLoading] as const;

					const swapTx = getAssetConversionSwapTxCall(
						api,
						tokenIn.token,
						tokenOut.token,
						plancksIn - (appFee.data ?? 0n),
						minPlancksOut,
						recipient,
					);

					const tx = appFeeTransferTx
						? api.tx.Utility.batch({
								calls: [swapTx.decodedCall, appFeeTransferTx.decodedCall],
							})
						: swapTx;

					return [tx, isLoading] as const;
				}),
			);
		}),
		map(([tx, isLoading]) =>
			loadableStateData<AnyTransaction | null>(tx, isLoading),
		),
		startWith(loadableStateLoading<AnyTransaction>()),
		catchError((error) => of(loadableStateError<AnyTransaction>(error))),
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
