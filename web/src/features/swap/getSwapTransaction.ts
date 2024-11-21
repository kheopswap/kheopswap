import type { SS58String } from "polkadot-api";

import { getApi, isApiAssetHub } from "@kheopswap/papi";
import {
	getChainById,
	getXcmV3MultilocationFromTokenId,
} from "@kheopswap/registry";
import {
	type TokenId,
	getChainIdFromTokenId,
	parseTokenId,
} from "@kheopswap/registry";
import { getAddressFromAccountField } from "@kheopswap/utils";

export const getSwapExtrinsic = async (
	tokenIdIn: TokenId,
	tokenIdOut: TokenId,
	amountIn: bigint,
	amountOutMin: bigint,
	dest: SS58String,
) => {
	const chainId = getChainIdFromTokenId(tokenIdIn);
	if (!chainId) return null;

	const chain = getChainById(chainId);
	if (!chain) return null;

	const address = getAddressFromAccountField(dest);
	if (!address) throw new Error("Invalid dest");

	const tokenIn = parseTokenId(tokenIdIn);
	if (tokenIn.chainId !== chain.id)
		throw new Error(`Token ${tokenIdIn} is not supported on chain ${chain.id}`);

	const tokenOut = parseTokenId(tokenIdOut);
	if (tokenOut.chainId !== chain.id)
		throw new Error(
			`Token ${tokenIdOut} is not supported on chain ${chain.id}`,
		);

	const api = await getApi(chain.id);

	if (!isApiAssetHub(api)) throw new Error("Chain is not an asset hub");

	return api.tx.AssetConversion.swap_exact_tokens_for_tokens({
		path: [
			getXcmV3MultilocationFromTokenId(tokenIdIn),
			getXcmV3MultilocationFromTokenId(tokenIdOut),
		],
		amount_in: amountIn,
		amount_out_min: amountOutMin,
		send_to: address,
		keep_alive: tokenIn.type === "native",
	});
};
