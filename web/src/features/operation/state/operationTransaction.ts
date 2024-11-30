import { type LoadableObsState, loadableStateData } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { type Observable, of, switchMap } from "rxjs";
import type { AnyTransaction } from "src/types";
import { getAssetConversionSwapTransaction$ } from "./helpers/getAssetConversionSwapTransaction";
import { getTransferTransaction$ } from "./helpers/getTransferTransaction";
import { type OperationInputs, operationInputs$ } from "./inputs.state";

const getOperationTransaction$ = (
	inputs: OperationInputs,
): Observable<LoadableObsState<AnyTransaction | null>> => {
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
