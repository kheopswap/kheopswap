import type { TokenId } from "@kheopswap/registry";

export type CreatePoolFormInputs = {
	token2Id: TokenId;
	from: string; // account key
	token1Amount: string;
	token2Amount: string;
};
