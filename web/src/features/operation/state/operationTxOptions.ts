import { getApi$ } from "@kheopswap/papi";
import type { ChainId } from "@kheopswap/registry";
import { combineLatest, map, of, switchMap } from "rxjs";
import { getFeeAssetLocation, getTxOptions } from "src/util";
import { operationFeeToken$ } from "./operationFeeToken";
import { operationInputs$ } from "./operationInputs";

const getNonce$ = (chainId: ChainId, address: string) => {
	return getApi$(chainId).pipe(
		switchMap((api) =>
			api.query.System.Account.watchValue(address, "best").pipe(
				map((accountInfo) => accountInfo.nonce),
			),
		),
	);
};

export const operationNonce$ = operationInputs$.pipe(
	switchMap((inputs) => {
		if (!inputs.account || !inputs.tokenIn?.token) return of(null);
		return getNonce$(inputs.tokenIn.token.chainId, inputs.account.address);
	}),
);

export const operationTxOptions$ = combineLatest([
	operationFeeToken$,
	operationNonce$,
]).pipe(
	map(([feeToken, nonce]) => {
		if (!feeToken || typeof nonce !== "number") return null;
		return getTxOptions({
			asset: feeToken ? getFeeAssetLocation(feeToken) : undefined,
			mortality: { mortal: true, period: 64 },
			nonce,
		});
	}),
);
