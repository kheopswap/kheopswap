import { getTokenById$ } from "@kheopswap/services/tokens";
import { getAddressFromAccountField, tokensToPlancks } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import type { TokenState } from "node_modules/@kheopswap/services/src/tokens/state";
import { combineLatest, map, of, switchMap } from "rxjs";
import { type InjectedAccount, getAccount$ } from "src/hooks";
import { operationFormData$ } from "./formData";

// type OperationFormData = {
// 	tokenIdIn?: TokenId;
// 	tokenIdOut?: TokenId;
// 	accountId?: string;
// 	recipient?: string;
// 	amountIn?: string;
// };

// const operationFormData$ = new BehaviorSubject<OperationFormData>({});

// export const resetOperationFormData = () => {
// 	operationFormData$.next({});
// };

// export const setOperationFormData = (
// 	data: OperationFormData | ((prev: OperationFormData) => OperationFormData),
// ) => {
// 	const newValue =
// 		typeof data === "function"
// 			? data(operationFormData$.value)
// 			: { ...operationFormData$.value, ...data };

// 	operationFormData$.next(consolidateFormData(newValue));
// };

// export const [useOperationFormData] = bind(operationFormData$);

type OperationInputs = {
	account: InjectedAccount | null;
	tokenIn: TokenState | null;
	tokenOut: TokenState | null;
	recipient: string | null;
	plancksIn: bigint | null;
};

export const operationInputs$ = operationFormData$.pipe(
	switchMap((formData) =>
		combineLatest([
			formData.accountId ? getAccount$(formData.accountId) : of(null),
			formData.tokenIdIn ? getTokenById$(formData.tokenIdIn) : of(null),
			formData.tokenIdOut ? getTokenById$(formData.tokenIdOut) : of(null),
		]).pipe(
			map(
				([account, tokenIn, tokenOut]): OperationInputs => ({
					account,
					tokenIn,
					tokenOut,
					recipient: getAddressFromAccountField(formData.recipient) ?? null,
					plancksIn:
						tokenIn?.token && !!formData.amountIn
							? tokensToPlancks(formData.amountIn, tokenIn.token.decimals)
							: null,
				}),
			),
		),
	),
);

export const [useOperationInputs] = bind(operationInputs$);

// const isRouteValid = (tokenIn: TokenId, tokenOut: TokenId): boolean => {
// 	return true; // TODO
// };

// const consolidateFormData = (data: OperationFormData): OperationFormData => {
// 	const newValue = structuredClone(data);

// 	if (
// 		!!data.tokenIdIn &&
// 		!data.tokenIdOut &&
// 		(!data.recipient ||
// 			isAccountCompatibleWithToken(data.recipient, data.tokenIdIn))
// 	)
// 		newValue.tokenIdOut = data.tokenIdIn;

// 	if (
// 		!!data.tokenIdOut &&
// 		!data.tokenIdIn &&
// 		(!data.accountId ||
// 			isAccountCompatibleWithToken(data.accountId, data.tokenIdOut))
// 	)
// 		newValue.tokenIdIn = data.tokenIdOut;

// 	if (
// 		!!data.accountId &&
// 		!data.recipient &&
// 		(!data.tokenIdOut ||
// 			isAccountCompatibleWithToken(data.accountId, data.tokenIdOut))
// 	)
// 		newValue.recipient = data.accountId;

// 	return newValue;
// };

// const isOperationInputsValid = (
// 	inputs: OperationFormData,
// ): inputs is OperationInputs => {
// 	return (
// 		!!inputs.tokenIdIn &&
// 		!!inputs.tokenIdOut &&
// 		!!inputs.sender &&
// 		!!inputs.recipient &&
// 		!!inputs.amountIn &&
// 		isRouteValid(inputs.tokenIdIn, inputs.tokenIdOut)
// 	);
// };

// const operationCall$ = operationFormData$.pipe(
// 	// map((inputs) => {
// 	//     const isValid = isOperationInputsValid(inputs)
// 	//     return {
// 	//         isValid,
// 	//         inputs: isValid ? inputs as OperationInputs : null
// 	//     }}
// 	//     ),
// 	switchMap((inputs) => {
// 		const isValid = isOperationInputsValid(inputs);

// 		if (!isValid)
// 			return of({
// 				isValid: false,
// 				call: null,
// 			});

// 		if (inputs.tokenIdIn === inputs.tokenIdOut)
// 			return getTransferOperation$(
// 				inputs.recipient,
// 				inputs.tokenIdIn,
// 				inputs.plancksIn,
// 			);

// 		throw new Error("TODO");
// 	}),
// );

// const getOperation = (inputs: OperationInputs) => {
// 	if (!isOperationInputsValid(inputs)) return { isValid: false, call: null };

// 	if (!inputs.tokenIdIn || !inputs.tokenIdOut)
// 		return { isValid: false, call: null };
// };

// const getTransferOperation$ = (
// 	to: string,
// 	tokenId: TokenId,
// 	plancks: bigint,
// ) => {
// 	return getTokenById$(tokenId).pipe(map((token) => {}));
// };
