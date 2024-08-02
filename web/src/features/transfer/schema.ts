import { TokenId } from "src/config/tokens";

export type TransferFormInputs = {
	tokenId: TokenId;
	from: string; // account key
	to: string; // account key or address
	amount: string;
};
