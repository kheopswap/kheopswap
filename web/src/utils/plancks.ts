import { formatUnits, parseUnits } from "viem";

export const tokensToPlancks = (tokens: string | number, decimals: number) => {
	return parseUnits(String(tokens), decimals);
};

export const plancksToTokens = (plancks: bigint | string, decimals: number) => {
	return formatUnits(BigInt(plancks), decimals);
};

export const inputToPlancks = (input: string, decimals: number) => {
	try {
		const plancks = tokensToPlancks(input.trim(), decimals);
		return plancks > 0n ? plancks : 0n;
	} catch {
		return 0n;
	}
};
