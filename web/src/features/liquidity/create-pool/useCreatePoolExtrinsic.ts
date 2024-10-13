import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";

import { getApi } from "@kheopswap/papi";
import { getChainById, isAssetHub } from "@kheopswap/registry";
import {
	POOL_TOKEN2_TOKEN_TYPES,
	type TokenId,
	parseTokenId,
} from "@kheopswap/registry";
import { safeQueryKeyPart } from "@kheopswap/utils";
import { getXcmV3MultilocationFromTokenId } from "src/util";

type UseCreatePoolExtrinsicProps = {
	tokenId1: TokenId | null | undefined;
	tokenId2: TokenId | null | undefined;
	liquidityToAdd: [bigint, bigint] | null;
	mintTo: SS58String | null;
};

export const useCreatePoolExtrinsic = ({
	tokenId1,
	tokenId2,
	liquidityToAdd,
	mintTo,
}: UseCreatePoolExtrinsicProps) => {
	return useQuery({
		queryKey: [
			"useCreatePoolExtrinsic",
			tokenId1,
			tokenId2,
			mintTo,
			safeQueryKeyPart(liquidityToAdd),
		],
		queryFn: () => {
			if (!tokenId1 || !tokenId2) return null;

			if (liquidityToAdd)
				if (!liquidityToAdd[0] || !liquidityToAdd[1] || !mintTo) return null;

			return getCreatePoolExtrinsic(tokenId1, tokenId2, liquidityToAdd, mintTo);
		},
		refetchInterval: false,
		structuralSharing: false,
	});
};

const getCreatePoolExtrinsic = async (
	tokenId1: TokenId,
	tokenId2: TokenId,
	liquidityToAdd: [bigint, bigint] | null,
	mintTo: SS58String | null,
) => {
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

	const createPool = api.tx.AssetConversion.create_pool({
		asset1,
		asset2,
	});
	if (!liquidityToAdd) return createPool;

	if (!mintTo) throw new Error("Invalid mintTo address");

	const addLiquidity = api.tx.AssetConversion.add_liquidity({
		asset1,
		asset2,
		amount1_desired: liquidityToAdd[0],
		amount1_min: liquidityToAdd[0],
		amount2_desired: liquidityToAdd[1],
		amount2_min: liquidityToAdd[1],
		mint_to: mintTo,
	});

	return api.tx.Utility.batch_all({
		calls: [createPool.decodedCall, addLiquidity.decodedCall],
	});
};
