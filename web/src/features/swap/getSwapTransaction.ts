import type { SS58String } from "polkadot-api";
import { getApi } from "../../papi/getApi";
import { getChainById } from "../../registry/chains/chains";
import {
	getChainIdFromTokenId,
	parseTokenId,
} from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";
import { getXcmV5MultilocationFromTokenId } from "../../registry/utils/xcmMultiLocation";
import { getAddressFromAccountField } from "../../utils/getAddressFromAccountField";

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

	return api.tx.AssetConversion.swap_exact_tokens_for_tokens({
		path: [
			getXcmV5MultilocationFromTokenId(tokenIdIn),
			getXcmV5MultilocationFromTokenId(tokenIdOut),
		],
		amount_in: amountIn,
		amount_out_min: amountOutMin,
		send_to: address,
		keep_alive: tokenIn.type === "native",
	});
};
