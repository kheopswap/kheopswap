import {
	type LoadableState,
	loadableState,
	loadableStateData,
	loadableStateError,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { type Observable, combineLatest, of, switchMap } from "rxjs";
import { operationInputs$ } from "./operationInputs";
import { operationTransaction$ } from "./operationTransaction";

export const [useOperationFeeEstimate, operationFeeEstimate$] = bind(
	combineLatest([operationInputs$, operationTransaction$]).pipe(
		switchMap(async ([inputs, ts]): Promise<LoadableState<bigint | null>> => {
			if (!inputs.account) return loadableStateData(null);
			try {
				const fee = await ts.data?.getEstimatedFees(inputs.account.address, {
					at: "best",
				});
				return loadableStateData(fee ?? null, ts.isLoading);
			} catch (cause) {
				return loadableStateError(
					new Error("Failed to get fee estimate", { cause }),
				);
			}
		}),
	),
);
