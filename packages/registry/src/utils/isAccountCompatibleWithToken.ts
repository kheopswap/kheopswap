import { type Token, type TokenId, parseTokenId } from "../tokens";
import { isAccountCompatibleWithChain } from "./isAccountCompatibleWithChain";

export const isAccountCompatibleWithToken = (
	address: string,
	tokenOrId: TokenId | Token,
): boolean => {
	try {
		const { chainId } =
			typeof tokenOrId === "string" ? parseTokenId(tokenOrId) : tokenOrId;
		return isAccountCompatibleWithChain(address, chainId);
	} catch {
		return false;
	}
};
