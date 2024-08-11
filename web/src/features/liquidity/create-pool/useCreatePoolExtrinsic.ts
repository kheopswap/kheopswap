import { useQuery } from "@tanstack/react-query";

import { getChainById, isAssetHub } from "src/config/chains";
import {
	POOL_TOKEN2_TOKEN_TYPES,
	type TokenId,
	parseTokenId,
} from "src/config/tokens";
import { getApi } from "src/services/api";
import { getXcmV3MultilocationFromTokenId } from "src/util";

type UseCreatePoolExtrinsicProps = {
	tokenId1: TokenId | null | undefined;
	tokenId2: TokenId | null | undefined;
};

export const useCreatePoolExtrinsic = ({
	tokenId1,
	tokenId2,
}: UseCreatePoolExtrinsicProps) => {
	return useQuery({
		queryKey: ["useCreatePoolExtrinsic", tokenId1, tokenId2],
		queryFn: () => {
			if (!tokenId1 || !tokenId2) return null;
			return getCreatePoolExtrinsic(tokenId1, tokenId2);
		},
		refetchInterval: false,
	});
};

const getCreatePoolExtrinsic = async (tokenId1: TokenId, tokenId2: TokenId) => {
	const token1 = parseTokenId(tokenId1);
	const token2 = parseTokenId(tokenId2);

	if (token1.chainId !== token2.chainId)
		throw new Error("Tokens are not on the same chain");
	if (token1.type !== "native")
		throw new Error("Token 1 is not a native token");
	if (!POOL_TOKEN2_TOKEN_TYPES.includes(token2.type))
		throw new Error("Invalid token type for token 2");

	const chain = getChainById(token1.chainId);
	if (!isAssetHub(chain)) throw new Error("Chain is not an asset hub");

	const asset1 = getXcmV3MultilocationFromTokenId(tokenId1);
	if (!asset1) throw new Error("Invalid location for token 1");

	const asset2 = getXcmV3MultilocationFromTokenId(tokenId2);
	if (!asset2) throw new Error("Invalid location for token 2");

	const api = await getApi(chain.id);

	return api.tx.AssetConversion.create_pool({
		asset1,
		asset2,
	});
};
