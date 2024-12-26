import { getBalance$ } from "@kheopswap/services/balances";
import {
	type LoadableState,
	isBigInt,
	loadableStateData,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { type Observable, combineLatest, map, of, switchMap } from "rxjs";
import { getExistentialDeposit$ } from "src/helpers/getExistentialDeposit";
import { type OperationInputs, operationInputs$ } from "./operationInputs";

// used to obtain estimate the max plancksIn that can be sent, which requires a fee estimate before user sets a value
const getOperationFakeInputs$ = ({
	data: inputs,
	isLoading,
}: LoadableState<OperationInputs>): Observable<
	LoadableState<OperationInputs | null>
> => {
	if (
		!inputs?.account ||
		!inputs.tokenIn?.token ||
		!inputs.tokenOut?.token ||
		!inputs.recipient
	)
		return of(loadableStateData(null, isLoading));

	return combineLatest([
		getExistentialDeposit$(inputs.tokenIn.token.id),
		getBalance$({
			address: inputs.account.address,
			tokenId: inputs.tokenIn.token.id,
		}),
	]).pipe(
		map(([eds, bs]) => {
			if (!isBigInt(bs.balance) || !isBigInt(eds.data))
				return loadableStateData(null, isLoading || eds.isLoading);

			return loadableStateData(
				{ ...inputs, plancksIn: eds.data },
				isLoading || eds.isLoading,
			);
		}),
	);
};

// const getOperationFakeInputs$ = (
// 	inputs: OperationInputs,
// ): Observable<LoadableState<OperationInputs | null>> => {
// 	if (
// 		!inputs.account ||
// 		!inputs.tokenIn?.token ||
// 		!inputs.tokenOut?.token ||
// 		!inputs.recipient
// 	)
// 		return of(loadableStateData(null));

// 	return combineLatest([
// 		getExistentialDeposit$(inputs.tokenIn.token.id),
// 		getBalance$({
// 			address: inputs.account.address,
// 			tokenId: inputs.tokenIn.token.id,
// 		}),
// 	]).pipe(
// 		map(([eds, bs]) => {
// 			if (eds.error)
// 				return loadableStateError<OperationInputs | null>(
// 					new Error("Failed to get existential deposit", { cause: eds.error }),
// 				);

// 			if (isBigInt(bs.balance) && isBigInt(eds.data) && bs.balance < eds.data)
// 				return loadableStateData(null, bs.status !== "loaded" || eds.isLoading);

// 			return loadableStateData(
// 				isBigInt(eds.data) ? { ...inputs, plancksIn: eds.data } : null,
// 				eds.isLoading,
// 			);
// 		}),
// 	);
// };

export const [useOperationFakeInputs, operationFakeInputs$] = bind(
	operationInputs$.pipe(switchMap(getOperationFakeInputs$)),
);
