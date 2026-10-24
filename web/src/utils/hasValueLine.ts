import type { TokenId } from "../registry/tokens/types";

export const hasValueLine = (
	tokenId: TokenId,
	stableTokenId: TokenId,
	tokenPlancks: bigint | null,
) => tokenId !== stableTokenId && tokenPlancks !== 0n;
