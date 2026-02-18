import type { ChainId } from "../registry/chains/types";
import { KNOWN_TOKENS_LIST } from "../registry/tokens/tokens";
import type { TokenNative } from "../registry/tokens/types";

export const getNativeToken = (chainId: ChainId) => {
	const nativeToken = KNOWN_TOKENS_LIST.find(
		(a) => a.type === "native" && a.chainId === chainId,
	) as TokenNative;
	if (!nativeToken)
		throw new Error(`Native token not found for chainId: ${chainId}`);
	return nativeToken;
};
