import { type Token, isChainIdAssetHub } from "@kheopswap/registry";
import {
	type LoadableState,
	isBigInt,
	loadableData,
	loadableError,
	loadableLoading,
	loadableState,
	logger,
} from "@kheopswap/utils";
import { type Observable, catchError, combineLatest, map, of } from "rxjs";
import { getPoolReserves$ } from "src/state";
import { getAssetConversionLPFee$ } from "./helpers/getAssetConversionLPFee";
import { getSwapAppFee$ } from "./helpers/getSwapAppFee";
import type { OperationInputs } from "./operationInputs";

type AssetConvertOutput = {
	plancksOut: bigint;
	poolFee: bigint;
};

const getAssetConvertOutput = (
	plancksIn: bigint,
	reserves: [bigint, bigint],
	lpFee: number,
): AssetConvertOutput => {
	const [reserveIn, reserveOut] = reserves;
	if (reserveIn === 0n || reserveOut === 0n) throw new Error("No liquidity");

	const safeMultiplier = 1000n;
	const plancksInMinusFee = plancksIn * (safeMultiplier - BigInt(lpFee));
	const poolFee =
		(safeMultiplier * plancksIn - plancksInMinusFee) / safeMultiplier;
	const numerator = plancksInMinusFee * reserveOut;
	const denominator = reserveIn * safeMultiplier + plancksInMinusFee;
	const plancksOut = numerator / denominator;

	return { plancksOut, poolFee };
};

export const getAssetConvertOutput$ = (
	tokenIn: Token | null | undefined,
	tokenOut: Token | null | undefined,
	plancksIn: bigint | null | undefined,
): Observable<LoadableState<AssetConvertOutput | null>> => {
	if (
		!isBigInt(plancksIn) ||
		!isChainIdAssetHub(tokenIn?.chainId) ||
		!isChainIdAssetHub(tokenOut?.chainId)
	)
		return of(loadableData(null));

	return combineLatest([
		getPoolReserves$(tokenIn.id, tokenOut.id),
		getSwapAppFee$(tokenIn, plancksIn),
		getAssetConversionLPFee$(tokenIn.chainId),
	]).pipe(
		map(
			([
				poolReserves,
				appFee,
				lpFee,
			]): LoadableState<AssetConvertOutput | null> => {
				if (!poolReserves.reserves || !lpFee.data || !isBigInt(appFee.data))
					return loadableLoading();

				const tradeIn = plancksIn - appFee.data;

				const output = getAssetConvertOutput(
					tradeIn,
					poolReserves.reserves,
					lpFee.data,
				);

				const isLoading =
					poolReserves.isLoading || lpFee.isLoading || appFee.isLoading;
				return loadableData(output, isLoading);
			},
		),
		catchError((cause) =>
			of(
				loadableError<AssetConvertOutput | null>(
					new Error("Failed to get AssetConvertOutput", { cause }),
				),
			),
		),
	);
};

export const getAssetConvertPlancksOut$ = (
	tokenIn: Token | null | undefined,
	tokenOut: Token | null | undefined,
	plancksIn: bigint | null | undefined,
): Observable<LoadableState<bigint | null>> =>
	getAssetConvertOutput$(tokenIn, tokenOut, plancksIn).pipe(
		map((res) =>
			loadableState(
				res.data
					? { ...res, data: res.data.plancksOut }
					: { ...res, data: undefined },
			),
		),
	);

export const getAssetConvertOperation$ = (inputs: OperationInputs) => {
	if (inputs.type !== "transfer") of(null);
	logger.debug("getTransferOperation", { inputs });

	const { tokenIn, tokenOut, plancksIn } = inputs;

	if (
		!isBigInt(plancksIn) ||
		!isChainIdAssetHub(tokenIn?.token?.chainId) ||
		!isChainIdAssetHub(tokenOut?.token?.chainId)
	)
		return of(null);

	return getAssetConvertPlancksOut$(tokenIn.token, tokenOut.token, plancksIn);
};
