import type { ChainId, Token } from "@kheopswap/registry";
import { getTokenById$ } from "@kheopswap/services/tokens";
import { getSetting$ } from "@kheopswap/settings";
import {
	type LoadableState,
	isBigInt,
	loadableStateData,
	loadableStateError,
} from "@kheopswap/utils";
import {
	type Observable,
	catchError,
	combineLatest,
	map,
	of,
	switchMap,
} from "rxjs";
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
const getFeeToken$ = (chainId: ChainId, address: string | null) => {
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
	switchMap(({ data: inputs }) => {
		if (!inputs?.tokenIn?.token) return of(null);
		return getFeeToken$(
			inputs.tokenIn.token.chainId,
			inputs.account?.address ?? null,
		);
	}),
);

type FeeWithToken = {
	token: Token;
	value: bigint;
};

export const operationFeeEstimateWithToken$ = combineLatest([
	operationInputs$,
	operationFeeToken$,
	operationFeeEstimate$,
]).pipe(
	switchMap(
		([{ data: inputs }, feeToken, feeEstimate]): Observable<
			LoadableState<FeeWithToken | null>
		> => {
			if (!feeToken || !isBigInt(feeEstimate.data) || !inputs?.tokenIn?.token)
				return of(
					loadableStateData<FeeWithToken | null>(null, feeEstimate.isLoading),
				);

			const token = feeToken as Token;

			if (feeToken.type === "native")
				return of(
					loadableStateData(
						{ value: feeEstimate.data, token },
						feeEstimate.isLoading,
					),
				);

			return getAssetConvert$({
				tokenIdIn: inputs.tokenIn.token.id,
				tokenIdOut: feeToken.id,
				plancksIn: feeEstimate.data,
			}).pipe(
				map((r) =>
					isBigInt(r.plancksOut)
						? loadableStateData<FeeWithToken | null>(
								{
									token,
									value: r.plancksOut,
								},
								feeEstimate.isLoading || r.isLoading,
							)
						: loadableStateData<FeeWithToken | null>(
								null,
								feeEstimate.isLoading || r.isLoading,
							),
				),
			);
		},
	),
	catchError((err) => of(loadableStateError<FeeWithToken | null>(err))),
);
