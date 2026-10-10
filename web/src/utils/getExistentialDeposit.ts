import { getApi } from "../papi/getApi";
import { parseTokenId } from "../registry/tokens/helpers";
import type { TokenId } from "../registry/tokens/types";

export const getExistentialDeposit = async (tokenId: TokenId) => {
	const token = parseTokenId(tokenId);

	switch (token.type) {
		case "asset": {
			const api = await getApi(token.chainId);
			const asset = await api.query.Assets.Asset.getValue(token.assetId, {
				at: "best",
			});
			return asset?.min_balance ?? null;
		}

		case "native": {
			const api = await getApi(token.chainId);
			return api.constants.Balances.ExistentialDeposit();
		}

		case "foreign-asset": {
			const api = await getApi(token.chainId);
			const asset = await api.query.ForeignAssets.Asset.getValue(
				token.location,
				{ at: "best" },
			);
			return asset?.min_balance ?? null;
		}

		case "hydration-asset": {
			const api = await getApi(token.chainId);
			const asset = await api.query.AssetRegistry.Assets.getValue(
				token.assetId,
				{ at: "best" },
			);
			return asset?.existential_deposit ?? null;
		}

		default:
			throw new Error(`Unsupported token type: ${tokenId}`);
	}
};
