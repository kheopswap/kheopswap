import { loadableStateData } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { of, switchMap } from "rxjs";
import { getAssetConvertPlancksOut$ } from "./operation.assetConvert";
import { operationInputs$ } from "./operationInputs";

export const [useOperationPlancksOut, operationPlancksOut$] = bind(
	operationInputs$.pipe(
		switchMap((inputs) => {
			switch (inputs.type) {
				case "transfer":
					// TODO existential deposit checks both sides
					return of(loadableStateData(inputs.plancksIn));
				case "asset-convert": {
					const { tokenIn, tokenOut, plancksIn } = inputs;
					return getAssetConvertPlancksOut$(
						tokenIn?.token,
						tokenOut?.token,
						plancksIn,
					);
				}
				default:
					return of(loadableStateData(null));
			}

			// if(inputs.type === "transfer") return of(inputs.plancksIn)

			// if (inputs.type !== "transfer") return of(null); //throw new Error("Invalid operation type");
			// return of(null);
			// switch(inputs.type) {
			// 	case "transfer":
			// 		return {
			// 			type: "transfer",
			// 			accountId: inputs.account?.id,
			// 			tokenIdIn: inputs.tokenIn?.token.id,
			// 			tokenIdOut: inputs.tokenOut?.token.id,
			// 			recipient: inputs.recipient,
			// 			amountIn: inputs.plancksIn?.toString(),
			// 		};
			// 	case "asset-convert":
			// 		return {
			// 			type: "asset-convert",
			// 			accountId: inputs.account?.id,
			// 			tokenIdIn: inputs.tokenIn?.token.id,
			// 			tokenIdOut: inputs.tokenOut?.token.id,
			// 			recipient: inputs.recipient,
			// 			amountIn: inputs.plancksIn?.toString(),
			// 		};
			// 	default:
			// 		return null
			// }
		}),
	),
);

// const getAssetConvertPlancksOut$ = (tokenIn:Token, tokenOut:Token, plancksIn:bigint) => {
// 	if (
// 		!isBigInt(plancksIn) ||
// 		!isChainIdAssetHub(tokenIn.chainId) ||
// 		!isChainIdAssetHub(tokenOut.chainId)
// 	)
// 		return of(null);

// 	const poolReserves$ = getPoolReserves$(
// 		tokenIn.id,
// 		tokenOut.id,
// 	);
// 	const slippage$ = getSetting$("slippage");
// 	const lpFee = getAssetConvertionLPFee$(tokenIn.chainId);

// 	return combineLatest([poolReserves$, slippage$, lpFee]).pipe(
// 		map(([poolReserves, slippage, lpFee]) => {
// 			if (!isBigInt(plancksIn)) return null; // workaround ts bug ?

// 			const appCommissionPlancks = getAssetConvertAppFee(plancksIn);
// 			const poolPlancksIn = plancksIn - appCommissionPlancks;

// 			// const plancksIn = plancksIn ?? BigInt(0);
// 			// const plancksOut = plancksIn - lpFee;
// 			// return plancksOut;
// 		}),
// 	);

// }
