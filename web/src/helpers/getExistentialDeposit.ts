import { getApi } from "../papi/getApi";
import { parseTokenId } from "../registry/tokens/helpers";
import type { TokenId } from "../registry/tokens/types";

export const getExistentialDeposit = async (tokenId: TokenId) => {
	const token = parseTokenId(tokenId);

	const api = await getApi(token.chainId);

	switch (token.type) {
		case "asset": {
			const asset = await api.query.Assets.Asset.getValue(token.assetId, {
				at: "best",
			});
			return asset?.min_balance ?? null;
		}

		case "native":
			return api.constants.Balances.ExistentialDeposit();

		case "foreign-asset": {
			const asset = await api.query.ForeignAssets.Asset.getValue(
				token.location,
				{ at: "best" },
			);
			return asset?.min_balance ?? null;
		}

		default:
			throw new Error(`Unsupported token type: ${tokenId}`);
	}
};
