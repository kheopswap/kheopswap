import type { TokenId } from "src/config/tokens";

export type CreatePoolFormInputs = {
	token2Id: TokenId;
	from: string; // account key
	token1Amount: string;
	token2Amount: string;
};
