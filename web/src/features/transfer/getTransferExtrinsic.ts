import { MultiAddress } from "@polkadot-api/descriptors";
import type { SS58String } from "polkadot-api";
import { getApi } from "../../papi/getApi";
import type { ChainIdAssetHub } from "../../registry/chains/types";
import { parseTokenId } from "../../registry/tokens/helpers";
import type { TokenId } from "../../registry/tokens/types";

export const getTransferExtrinsic = async (
	chainId: ChainIdAssetHub,
	tokenId: TokenId,
	plancks: bigint,
	dest: SS58String,
) => {
	const api = await getApi(chainId);

	const token = parseTokenId(tokenId);
	if (chainId !== token.chainId)
		throw new Error(`Token ${tokenId} is not supported on chain ${chainId}`);

	switch (token.type) {
		case "asset": {
			return api.tx.Assets.transfer({
				id: token.assetId,
				target: MultiAddress.Id(dest),
				amount: plancks,
			});
		}
		case "native": {
			return api.tx.Balances.transfer_keep_alive({
				dest: MultiAddress.Id(dest),
				value: plancks,
			});
		}
		case "foreign-asset": {
			return api.tx.ForeignAssets.transfer({
				id: token.location,
				amount: plancks,
				target: MultiAddress.Id(dest),
			});
		}
		default:
			throw new Error(`Unsupported token type ${tokenId}`);
	}
};
