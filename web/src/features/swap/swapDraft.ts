import { getBridgedAssetHub } from "../../registry/chains/chains";
import type {
	Chain,
	ChainId,
	ChainIdAssetHub,
} from "../../registry/chains/types";
import { getTokenId, parseTokenId } from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";
import type { SwapFormInputs } from "./schema";

const isDraftInView = (
	{ tokenIdIn, tokenIdOut }: SwapFormInputs,
	relayChains: Chain[],
	assetHubId: ChainIdAssetHub,
) => {
	const chainIds = [tokenIdIn, tokenIdOut]
		.filter(Boolean)
		.map((tokenId) => parseTokenId(tokenId).chainId);
	const bridgedAssetHubId = getBridgedAssetHub(assetHubId)?.id;
	const isOnRelay = (chainId: ChainId) =>
		relayChains.some((chain) => chain.id === chainId);

	return (
		chainIds.every(
			(chainId) => isOnRelay(chainId) || chainId === bridgedAssetHubId,
		) &&
		(!chainIds.length || chainIds.some(isOnRelay))
	);
};

export const getDraftOnRelay = (
	draft: SwapFormInputs,
	relayChains: Chain[],
	assetHubId: ChainIdAssetHub,
): SwapFormInputs =>
	isDraftInView(draft, relayChains, assetHubId)
		? draft
		: {
				...draft,
				tokenIdIn: getTokenId({ type: "native", chainId: assetHubId }),
				tokenIdOut: "" as TokenId,
				amountIn: "",
			};
