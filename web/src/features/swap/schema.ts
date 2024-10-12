import type { TokenId } from "@kheopswap/registry";

export type SwapFormInputs = {
	from: string;
	to: string;
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	amountIn: string;
};
