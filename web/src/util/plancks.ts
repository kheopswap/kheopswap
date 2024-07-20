import { parseUnits, formatUnits } from "viem";

export const tokensToPlancks = (tokens: string | number, decimals: number) => {
  return parseUnits(String(tokens), decimals);
};

export const plancksToTokens = (plancks: bigint | string, decimals: number) => {
  return formatUnits(BigInt(plancks), decimals);
};
