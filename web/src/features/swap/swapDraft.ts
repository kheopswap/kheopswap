import type { Chain, ChainIdAssetHub } from "../../registry/chains/types";
import { getTokenId, parseTokenId } from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";
import type { SwapFormInputs } from "./schema";

const isOnOtherRelay = (tokenId: string, relayChains: Chain[]) => {
	if (!tokenId) return false;
	const { chainId } = parseTokenId(tokenId as TokenId);
	return !relayChains.some((chain) => chain.id === chainId);
};

export const getDraftOnRelay = (
	draft: SwapFormInputs,
	relayChains: Chain[],
	assetHubId: ChainIdAssetHub,
): SwapFormInputs =>
	isOnOtherRelay(draft.tokenIdIn, relayChains) ||
	isOnOtherRelay(draft.tokenIdOut, relayChains)
		? {
				...draft,
				tokenIdIn: getTokenId({ type: "native", chainId: assetHubId }),
				tokenIdOut: "",
				amountIn: "",
			}
		: draft;
