import { type LoadableState, loadableStateData } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { type Observable, of, switchMap } from "rxjs";
import type { AnyTransaction } from "src/types";
import { getAssetConversionSwapTransaction$ } from "./helpers/getAssetConversionSwapTransaction";
import { getTransferTransaction$ } from "./helpers/getTransferTransaction";
import { operationFakeInputs$ } from "./operationFakeInputs";
import { type OperationInputs, operationInputs$ } from "./operationInputs";

const getOperationTransaction$ = (
	inputs: OperationInputs | null,
): Observable<LoadableState<AnyTransaction | null>> => {
	if (!inputs) return of(loadableStateData(null));

	switch (inputs.type) {
		case "transfer":
			return getTransferTransaction$(inputs);
		case "asset-convert":
			return getAssetConversionSwapTransaction$(inputs);
		default:
			return of(loadableStateData(null));
	}
};

export const [useOperationTransaction, operationTransaction$] = bind(
	operationInputs$.pipe(switchMap(getOperationTransaction$)),
);

export const [useOperationFakeTransaction, operationFakeTransaction$] = bind(
	operationFakeInputs$.pipe(switchMap(getOperationTransaction$)),
);
