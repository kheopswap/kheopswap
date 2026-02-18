import type { TokenId } from "../../registry/tokens/types";

export type SwapFormInputs = {
	from: string;
	to: string;
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	amountIn: string;
};
