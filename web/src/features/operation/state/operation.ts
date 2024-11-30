// import { bind } from "@react-rxjs/core";
// import { of, switchMap } from "rxjs";
// import type { AnyTransaction } from "src/types";
// import { getTransferTransaction$ } from "./helpers/getTransferTransaction";
// import { type OperationInputs, operationInputs$ } from "./inputs.state";
// import { getAssetConvertOperation$ } from "./operation.assetConvert";

// const getOperation$ = (inputs: OperationInputs) => {
// 	switch (inputs.type) {
// 		case "transfer":
// 			return getTransferTransaction$(inputs);
// 		case "asset-convert":
// 			return getAssetConvertOperation$(inputs);
// 		case "invalid":
// 			return of(null);
// 		default:
// 			return of(null);
// 	}
// };

// export const [useOperation, operation$] = bind(
// 	operationInputs$.pipe(switchMap(getOperation$)),
// );

// type Operation = {
// 	inputs: OperationInputs;
// 	extrinsic: AnyTransaction | null;
// 	dryRun: null; //
// 	errors: string[]; // ??
// };
