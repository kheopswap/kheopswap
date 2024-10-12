import type { TokenId } from "@kheopswap/registry";

export type TransferFormInputs = {
	tokenId: TokenId;
	from: string; // account key
	to: string; // account key or address
	amount: string;
};
