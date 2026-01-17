import { getApi, isApiAssetHub, isApiHydration } from "@kheopswap/papi";
import { parseTokenId, type TokenId } from "@kheopswap/registry";

export const getExistentialDeposit = async (tokenId: TokenId) => {
	const token = parseTokenId(tokenId);

	const api = await getApi(token.chainId);

	switch (token.type) {
		case "asset": {
			if (!isApiAssetHub(api)) throw new Error("Chain is not an asset hub");
			const asset = await api.query.Assets.Asset.getValue(token.assetId, {
				at: "best",
			});
			return asset?.min_balance ?? null;
		}

		case "native":
			return api.constants.Balances.ExistentialDeposit();

		case "foreign-asset": {
			if (!isApiAssetHub(api)) throw new Error("Chain is not an asset hub");
			const asset = await api.query.ForeignAssets.Asset.getValue(
				token.location,
				{ at: "best" },
			);
			return asset?.min_balance ?? null;
		}

		case "hydration-asset": {
			if (!isApiHydration(api)) throw new Error("Chain is not Hydration");
			const asset = await api.query.AssetRegistry.Assets.getValue(
				token.assetId,
				{
					at: "best",
				},
			);
			return asset?.existential_deposit ?? null;
		}

		default:
			throw new Error(`Unsupported token type: ${tokenId}`);
	}
};
