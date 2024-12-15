import type { ChainId, Token } from "@kheopswap/registry";
import { getTokenById$ } from "@kheopswap/services/tokens";
import { getSetting$ } from "@kheopswap/settings";
import { isBigInt } from "@kheopswap/utils";
import { combineLatest, map, of, switchMap } from "rxjs";
import { getAssetConvert$ } from "src/state";
import { getNativeToken } from "src/util";
import { operationFeeEstimate$ } from "./operationFeeEstimate";
import { operationInputs$ } from "./operationInputs";

const getKey = (
	chainId: ChainId | null | undefined,
	address: string | null,
) => {
	if (!address || !chainId) return "";

	return `${chainId}||${address}`;
};

// TODO move somewhere else
export const getFeeToken$ = (chainId: ChainId, address: string | null) => {
	const key = getKey(chainId, address);
	return getSetting$("feeTokens").pipe(
		switchMap((feeTokens) => {
			const feeTokenId = feeTokens[key];
			if (!feeTokenId) return of(getNativeToken(chainId));
			return getTokenById$(feeTokenId).pipe(map((ts) => ts.token ?? null));
		}),
	);
};

export const operationFeeToken$ = operationInputs$.pipe(
	switchMap((inputs) => {
		if (!inputs.tokenIn?.token) return of(null);
		return getFeeToken$(
			inputs.tokenIn.token.chainId,
			inputs.account?.address ?? null,
		);
		// const feeTokenKey = getKey(

		// 	inputs.tokenIn.token.chainId,
		//     inputs.account?.address ?? null,
		// );
		// const feeTokenId = feeTokens[feeTokenKey];
		// if (!feeTokenId) return of(getNativeToken(inputs.tokenIn.token.chainId));
		// return getTokenById$(feeTokenId).pipe(map((ts) => ts.token ?? null));
	}),
);

export const operationFeeEstimateWithToken$ = combineLatest([
	operationInputs$,
	operationFeeToken$,
	operationFeeEstimate$,
]).pipe(
	switchMap(([inputs, feeToken, feeEstimate]) => {
		if (!feeToken || !isBigInt(feeEstimate) || !inputs.tokenIn?.token)
			return of(null);

		const token = feeToken as Token;

		if (feeToken.type === "native")
			return of({ value: feeEstimate?.data ?? null, token });

		return getAssetConvert$({
			tokenIdIn: inputs.tokenIn.token.id,
			tokenIdOut: feeToken.id,
			plancksIn: feeEstimate,
		}).pipe(
			map((r) => ({
				token,
				value: r.plancksOut,
			})),
		);
	}),
);
