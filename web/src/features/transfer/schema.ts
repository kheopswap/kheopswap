import type { TokenId } from "../../registry/tokens/types";

export type TransferFormInputs = {
	tokenId: TokenId;
	from: string; // account key
	to: string; // account key or address
	amount: string;
};
