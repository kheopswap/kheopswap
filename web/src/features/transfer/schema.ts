import {
	type DraftFields,
	isDraftText,
	isDraftTokenId,
} from "../../hooks/usePersistedFormDraft";
import type { TokenId } from "../../registry/tokens/types";

export type TransferFormInputs = {
	tokenId: TokenId;
	from: string;
	to: string;
	amount: string;
};

export const TRANSFER_DRAFT_FIELDS: DraftFields<TransferFormInputs> = {
	tokenId: isDraftTokenId,
	from: isDraftText,
	to: isDraftText,
	amount: isDraftText,
};
