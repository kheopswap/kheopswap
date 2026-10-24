import type { SS58String } from "polkadot-api";
import { getApi } from "../../papi/getApi";
import type { ChainIdAssetHub } from "../../registry/chains/types";
import { parseTokenId } from "../../registry/tokens/helpers";
import { getXcmV5MultilocationFromTokenId } from "../../registry/utils/xcmMultiLocation";
import { getAddressFromAccountField } from "../../utils/getAddressFromAccountField";
import { type AmmPath, getPathTokenIds } from "./routes/ammPath";

export const getSwapExtrinsic = async (
	chainId: ChainIdAssetHub,
	path: AmmPath,
	amountIn: bigint,
	amountOutMin: bigint,
	dest: SS58String,
) => {
	const address = getAddressFromAccountField(dest);
	if (!address) throw new Error("Invalid dest");

	const tokenIds = getPathTokenIds(path);
	for (const tokenId of tokenIds)
		if (parseTokenId(tokenId).chainId !== chainId)
			throw new Error(`Token ${tokenId} is not supported on chain ${chainId}`);

	const api = await getApi(chainId);

	return api.tx.AssetConversion.swap_exact_tokens_for_tokens({
		path: tokenIds.map(getXcmV5MultilocationFromTokenId),
		amount_in: amountIn,
		amount_out_min: amountOutMin,
		send_to: address,
		keep_alive: parseTokenId(path[0].tokenIdIn).type === "native",
	});
};
