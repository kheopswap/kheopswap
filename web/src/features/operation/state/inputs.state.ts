import {
	type Token,
	type TokenType,
	isChainIdAssetHub,
} from "@kheopswap/registry";
import { getTokenById$ } from "@kheopswap/services/tokens";
import { getAddressFromAccountField, tokensToPlancks } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import type { TokenState } from "node_modules/@kheopswap/services/src/tokens/state";
import { combineLatest, map, of, switchMap } from "rxjs";
import { type InjectedAccount, getAccount$ } from "src/hooks";
import { type OperationFormData, operationFormData$ } from "./formData";

export type OperationInputs = {
	type: OperationType | null;
	account: InjectedAccount | null;
	tokenIn: TokenState | null;
	tokenOut: TokenState | null;
	recipient: string | null;
	plancksIn: bigint | null;
};

export const operationInputs$ = operationFormData$.pipe(
	switchMap((formData) => getOperationInputs$(formData)),
);

const getOperationInputs$ = (formData: OperationFormData) => {
	const account$ = formData.accountId
		? getAccount$(formData.accountId)
		: of(null);
	const tokenIn$ = formData.tokenIdIn
		? getTokenById$(formData.tokenIdIn)
		: of(null);
	const tokenOut$ = formData.tokenIdOut
		? getTokenById$(formData.tokenIdOut)
		: of(null);

	return combineLatest([account$, tokenIn$, tokenOut$]).pipe(
		map(
			([account, tokenIn, tokenOut]): OperationInputs => ({
				type: getOperationType(tokenIn?.token, tokenOut?.token),
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
	);
};

export const [useOperationInputs] = bind(operationInputs$);

type OperationType =
	| "transfer"
	| "asset-convert"
	| "xcm"
	| "invalid"
	| "unknown";

const getOperationType = (
	tokenIn: Token | null | undefined,
	tokenOut: Token | null | undefined,
): OperationType => {
	if (!tokenIn || !tokenOut) return "unknown";

	if (tokenIn.id === tokenOut.id) return "transfer";

	if (tokenIn.chainId !== tokenOut.chainId) return "xcm";

	const types = [tokenIn.type, tokenOut.type];
	if (
		[tokenIn.chainId, tokenOut.chainId].every(isChainIdAssetHub) &&
		types.some((type) => type === "native") &&
		types.some((type) => ASSET_CONVERT_NON_NATIVE_TOKEN_TYPES.includes(type))
	)
		return "asset-convert";

	return "unknown";
};

const ASSET_CONVERT_NON_NATIVE_TOKEN_TYPES: TokenType[] = [
	"asset",
	"foreign-asset",
];

// 	// need one native
// 	if (!.includes("native")) return false;

// 	// need one non-native
// 	if (
// 		![tokenIn.type, tokenOut.type].some((type) =>
// 			ASSET_CONVERT_NON_NATIVE_TOKEN_TYPES.includes(type),
// 		)
// 	)
// 		return false;

// 	return true;
// };

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
