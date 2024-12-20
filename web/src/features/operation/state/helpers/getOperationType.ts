import {
	type Token,
	type TokenType,
	isChainIdAssetHub,
} from "@kheopswap/registry";

export type OperationType =
	| "transfer"
	| "asset-convert"
	| "xcm"
	| "invalid"
	| "unknown";

export const getOperationType = (
	tokenIn: Token | null | undefined,
	tokenOut: Token | null | undefined,
): OperationType => {
	if (!tokenIn || !tokenOut) return "unknown";

	if (isTransfer(tokenIn, tokenOut)) return "transfer";

	if (isAssetConvert(tokenIn, tokenOut)) return "asset-convert";

	if (isXcm(tokenIn, tokenOut)) return "xcm";

	return "invalid";
};

export const isValidOperation = (type: OperationType): boolean => {
	switch (type) {
		case "transfer":
		case "asset-convert":
		case "xcm":
			return true;
		default:
			return false;
	}
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
