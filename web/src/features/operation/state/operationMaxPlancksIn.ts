import { getTokenId } from "@kheopswap/registry";
import { getBalance$ } from "@kheopswap/services/balances";
import { isBigInt } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { combineLatest, map, of, switchMap } from "rxjs";
import { getExistentialDeposit$ } from "src/helpers/getExistentialDeposit";
import { getAssetConvert$ } from "src/state";
import { operationFeeToken$ } from "./operationFeeToken";
import { operationInputs$ } from "./operationInputs";
import {
	operationFakeTransaction$,
	operationTransaction$,
} from "./operationTransaction";
import { operationTxOptions$ } from "./operationTxOptions";

// TODO make loadable
const feeEstimate$ = combineLatest([
	operationInputs$,
	operationTransaction$,
	operationFakeTransaction$,
	operationTxOptions$,
]).pipe(
	switchMap(
		async ([{ data: inputs }, ts, fts, options]): Promise<bigint | null> => {
			if (!inputs?.account || !options) return null;
			try {
				// fallback to fake transaction if real transaction is not available
				const fee = await (ts.data ?? fts.data)?.getEstimatedFees(
					inputs.account.address,
					{
						at: "best",
						...options,
					},
				);
				return fee ?? null;
			} catch {
				return null;
			}
		},
	),
);

const maxPlancksIn$ = combineLatest([
	operationInputs$,
	operationFeeToken$,
]).pipe(
	switchMap(([{ data: inputs }, feeToken]) => {
		if (!inputs?.tokenIn?.token || !inputs.account || !feeToken)
			return of(null);

		const balance$ = getBalance$({
			address: inputs.account.address,
			tokenId: inputs.tokenIn.token.id,
		}).pipe(map((bs) => bs.balance ?? null));

		if (inputs.tokenIn.token.type === "native") {
			return combineLatest([
				balance$,
				getExistentialDeposit$(inputs.tokenIn.token.id).pipe(
					map((eds) => eds.data ?? null),
				),
				feeEstimate$,
			]).pipe(
				map(([balance, ed, fee]) => {
					if (
						!isBigInt(balance) ||
						!isBigInt(ed) ||
						!isBigInt(fee) ||
						!feeToken ||
						!inputs.tokenIn?.token
					)
						return null;
					if (feeToken.id !== inputs.tokenIn.token.id)
						return balance < ed ? balance : balance - ed;
					return balance < ed + fee ? balance : balance - ed - fee;
				}),
			);
		}

		// TODO edge case if asset is not the native asset but is the only sufficient asset the account has
		if (feeToken?.id === inputs.tokenIn.token.id) {
			return feeEstimate$.pipe(
				switchMap((nativeFee) =>
					isBigInt(nativeFee)
						? combineLatest([
								balance$,
								getAssetConvert$({
									// TODO not good we need to leverage the swap_for_exact_output function
									tokenIdIn: getTokenId({
										type: "native",
										// biome-ignore lint/style/noNonNullAssertion: <explanation>
										chainId: inputs.tokenIn!.token!.chainId,
									}),
									tokenIdOut: feeToken.id,
									plancksIn: nativeFee,
								}),
							])
						: of([null, null]),
				),
				map(([balance, fee]) => {
					return isBigInt(balance) && isBigInt(fee?.plancksOut)
						? balance > fee.plancksOut
							? balance - fee.plancksOut
							: balance
						: null;
				}),
			);
		}

		return balance$;
	}),
);

// TODO loadable
export const [useOperationMaxPlancksIn, operationMaxPlancksIn$] = bind(
	maxPlancksIn$,
	null,
);
