import { getBalance$ } from "@kheopswap/services/balances";
import { type LoadableState, isBigInt, loadableData } from "@kheopswap/utils";
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
		return of(loadableData(null, isLoading));

	return combineLatest([
		getExistentialDeposit$(inputs.tokenIn.token.id),
		getBalance$({
			address: inputs.account.address,
			tokenId: inputs.tokenIn.token.id,
		}),
	]).pipe(
		map(([eds, bs]) => {
			if (!isBigInt(bs.balance) || !isBigInt(eds.data))
				return loadableData(null, isLoading || eds.isLoading);

			return loadableData(
				{ ...inputs, plancksIn: eds.data },
				isLoading || eds.isLoading,
			);
		}),
	);
};

export const [useOperationFakeInputs, operationFakeInputs$] = bind(
	operationInputs$.pipe(switchMap(getOperationFakeInputs$)),
	loadableData<OperationInputs | null>(null),
);
