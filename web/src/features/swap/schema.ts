import { TokenId } from "src/config/tokens";

export type SwapFormInputs = {
  from: string;
  to: string;
  tokenIdIn: TokenId;
  tokenIdOut: TokenId;
  amountIn: string;
};
