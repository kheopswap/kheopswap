import {
	type DraftFields,
	isDraftText,
	isDraftTokenId,
} from "../../hooks/usePersistedFormDraft";
import type { TokenId } from "../../registry/tokens/types";

export type SwapFormInputs = {
	from: string;
	to: string;
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	amountIn: string;
};

export const SWAP_DRAFT_FIELDS: DraftFields<SwapFormInputs> = {
	from: isDraftText,
	to: isDraftText,
	tokenIdIn: isDraftTokenId,
	tokenIdOut: isDraftTokenId,
	amountIn: isDraftText,
};
