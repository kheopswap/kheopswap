import {
	type LoadableState,
	loadableStateData,
	loadableStateError,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { combineLatest, switchMap } from "rxjs";
import { operationInputs$ } from "./operationInputs";
import { operationTransaction$ } from "./operationTransaction";

export const [useOperationFeeEstimate, operationFeeEstimate$] = bind(
	combineLatest([operationInputs$, operationTransaction$]).pipe(
		switchMap(
			async ([{ data: inputs, isLoading }, ts]): Promise<
				LoadableState<bigint | null>
			> => {
				if (!inputs?.account) return loadableStateData(null, isLoading);
				try {
					const fee = await ts.data?.getEstimatedFees(inputs.account.address, {
						at: "best",
					});
					return loadableStateData(fee ?? null, isLoading || ts.isLoading);
				} catch (cause) {
					return loadableStateError(
						new Error("Failed to get fee estimate", { cause }),
					);
				}
			},
		),
	),
	loadableStateData(null),
);
