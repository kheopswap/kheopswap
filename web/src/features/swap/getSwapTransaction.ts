import type { SS58String } from "polkadot-api";
import { getApi } from "../../papi/getApi";
import type { ChainIdAssetHub } from "../../registry/chains/types";
import { parseTokenId } from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";
import { getXcmV5MultilocationFromTokenId } from "../../registry/utils/xcmMultiLocation";
import { getAddressFromAccountField } from "../../utils/getAddressFromAccountField";

export const getSwapExtrinsic = async (
	chainId: ChainIdAssetHub,
	tokenIdIn: TokenId,
	tokenIdOut: TokenId,
	amountIn: bigint,
	amountOutMin: bigint,
	dest: SS58String,
) => {
	const address = getAddressFromAccountField(dest);
	if (!address) throw new Error("Invalid dest");

	const tokenIn = parseTokenId(tokenIdIn);
	if (tokenIn.chainId !== chainId)
		throw new Error(`Token ${tokenIdIn} is not supported on chain ${chainId}`);

	const tokenOut = parseTokenId(tokenIdOut);
	if (tokenOut.chainId !== chainId)
		throw new Error(`Token ${tokenIdOut} is not supported on chain ${chainId}`);

	const api = await getApi(chainId);

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
