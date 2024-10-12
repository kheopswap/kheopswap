import type { ChainId } from "@kheopswap/registry";
import { KNOWN_TOKENS_LIST } from "@kheopswap/registry";
import type { TokenNative } from "@kheopswap/registry";

export const getNativeToken = (chainId: ChainId) => {
	const nativeToken = KNOWN_TOKENS_LIST.find(
		(a) => a.type === "native" && a.chainId === chainId,
	) as TokenNative;
	if (!nativeToken)
		throw new Error(`Native token not found for chainId: ${chainId}`);
	return nativeToken;
};
