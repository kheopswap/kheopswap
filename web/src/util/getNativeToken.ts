import type { ChainId } from "src/config/chains";
import { KNOWN_TOKENS_LIST } from "src/config/tokens";
import type { TokenNative } from "src/config/tokens/types";

export const getNativeToken = (chainId: ChainId) => {
	const nativeToken = KNOWN_TOKENS_LIST.find(
		(a) => a.type === "native" && a.chainId === chainId,
	) as TokenNative;
	if (!nativeToken)
		throw new Error(`Native token not found for chainId: ${chainId}`);
	return nativeToken;
};
