import type { SS58String } from "polkadot-api-test";

import { getApi } from "@kheopswap/papi";
import {
	getChainById,
	getXcmV3MultilocationFromTokenId,
	isAssetHub,
} from "@kheopswap/registry";
import {
	type TokenId,
	getChainIdFromTokenId,
	parseTokenId,
} from "@kheopswap/registry";
import { getAddressFromAccountField, isBigInt } from "@kheopswap/utils";

export type GetAddLiquidityExtrinsicProps = {
	tokenIdNative: TokenId;
	tokenIdAsset: TokenId;
	amountNative: bigint;
	amountNativeMin: bigint;
	amountAsset: bigint;
	amountAssetMin: bigint;
	dest: SS58String;
	createPool?: boolean;
};

export const isValidGetAddLiquidityExtrinsicProps = (
	props: Partial<GetAddLiquidityExtrinsicProps>,
): props is GetAddLiquidityExtrinsicProps => {
	return (
		!!props &&
		!!props.tokenIdNative &&
		!!props.tokenIdAsset &&
		isBigInt(props.amountNative) &&
		isBigInt(props.amountNativeMin) &&
		isBigInt(props.amountAsset) &&
		isBigInt(props.amountAssetMin) &&
		!!props.dest
	);
};

export const getAddLiquidityExtrinsic = async ({
	tokenIdNative,
	tokenIdAsset,
	amountNative,
	amountNativeMin,
	amountAsset,
	amountAssetMin,
	dest,
	createPool,
}: GetAddLiquidityExtrinsicProps) => {
	const chainId = getChainIdFromTokenId(tokenIdNative);
	if (!chainId) return null;

	const chain = getChainById(chainId);
	if (!chain) return null;

	const address = getAddressFromAccountField(dest);
	if (!address) throw new Error("Invalid dest");

	const tokenIn = parseTokenId(tokenIdNative);
	if (tokenIn.chainId !== chain.id)
		throw new Error(
			`Token ${tokenIdNative} is not supported on chain ${chain.id}`,
		);

	const tokenOut = parseTokenId(tokenIdAsset);
	if (tokenOut.chainId !== chain.id)
		throw new Error(
			`Token ${tokenIdAsset} is not supported on chain ${chain.id}`,
		);

	if (!isAssetHub(chain)) throw new Error("Chain is not an asset hub");

	const asset1 = getXcmV3MultilocationFromTokenId(tokenIdNative);
	if (!asset1)
		throw new Error("Failed to convert native token to multilocation");

	const asset2 = getXcmV3MultilocationFromTokenId(tokenIdAsset);
	if (!asset2)
		throw new Error("Failed to convert asset token to multilocation");

	const api = await getApi(chain.id);

	const call = api.tx.AssetConversion.add_liquidity({
		asset1,
		asset2,
		amount1_desired: amountNative,
		amount1_min: amountNativeMin,
		amount2_desired: amountAsset,
		amount2_min: amountAssetMin,
		mint_to: address,
	});

	if (createPool) {
		const createPoolCall = api.tx.AssetConversion.create_pool({
			asset1,
			asset2,
		});

		return api.tx.Utility.batch_all({
			calls: [createPoolCall.decodedCall, call.decodedCall],
		});
	}

	return call;
};
