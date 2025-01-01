import { type LoadableState, loadableData } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { type Observable, of, switchMap } from "rxjs";
import type { AnyTransaction } from "src/types";
import { getAssetConversionSwapTransaction$ } from "./helpers/getAssetConversionSwapTransaction";
import { getTransferTransaction$ } from "./helpers/getTransferTransaction";
import { getXcmTransaction$ } from "./helpers/getXcmTransaction";
import { operationFakeInputs$ } from "./operationFakeInputs";
import { type OperationInputs, operationInputs$ } from "./operationInputs";

const getOperationTransaction$ = ({
	data: inputs,
	isLoading,
}: LoadableState<OperationInputs | null>): Observable<
	LoadableState<AnyTransaction | null>
> => {
	if (!inputs) return of(loadableData(null, isLoading));

	switch (inputs.type) {
		case "transfer":
			return getTransferTransaction$(inputs);
		case "asset-convert":
			return getAssetConversionSwapTransaction$(inputs);
		case "xcm":
			return getXcmTransaction$(inputs);
		default:
			return of(loadableData(null));
	}
};

export const [useOperationTransaction, operationTransaction$] = bind(
	operationInputs$.pipe(switchMap(getOperationTransaction$)),
	loadableData(null),
);

export const [useOperationFakeTransaction, operationFakeTransaction$] = bind(
	operationFakeInputs$.pipe(switchMap(getOperationTransaction$)),
	loadableData(null),
);
