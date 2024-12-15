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
import {
	type OperationFormData,
	operationFormData$,
} from "./operationFormData";

export type OperationInputs = {
	type: OperationType | null;
	account: InjectedAccount | null;
	tokenIn: TokenState | null;
	tokenOut: TokenState | null;
	recipient: string | null;
	plancksIn: bigint | null;
};

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

export const [useOperationInputs, operationInputs$] = bind(
	operationFormData$.pipe(
		switchMap((formData) => getOperationInputs$(formData)),
	),
);

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

	if (isTransfer(tokenIn, tokenOut)) return "transfer";

	if (isAssetConvert(tokenIn, tokenOut)) return "asset-convert";

	if (isXcm(tokenIn, tokenOut)) return "xcm";

	return "invalid";
};

const ASSET_CONVERT_NON_NATIVE_TOKEN_TYPES: TokenType[] = [
	"asset",
	"foreign-asset",
];

const isTransfer = (tokenIn: Token, tokenOut: Token): boolean => {
	if (!tokenIn || !tokenOut) return false;
	return tokenIn.id === tokenOut.id;
};

const isAssetConvert = (tokenIn: Token, tokenOut: Token): boolean => {
	if (!tokenIn || !tokenOut) return false;

	// must be on same chain
	if (tokenIn.chainId !== tokenOut.chainId) return false;

	// must be on asset hub
	if (!isChainIdAssetHub(tokenIn.chainId)) return false;

	// need one native and one non-native
	const types = [tokenIn.type, tokenOut.type];
	if (
		!types.includes("native") ||
		!types.some((type) => ASSET_CONVERT_NON_NATIVE_TOKEN_TYPES.includes(type))
	)
		return false;

	// LGTM
	return true;
};

const isXcm = (tokenIn: Token, tokenOut: Token): boolean => {
	if (!tokenIn || !tokenOut) return false;

	const tokenInOrigin = "origin" in tokenIn ? tokenIn.origin : null;
	const tokenOutOrigin = "origin" in tokenOut ? tokenOut.origin : null;

	return tokenInOrigin === tokenOut.id || tokenOutOrigin === tokenIn.id;
};
