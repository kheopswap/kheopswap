import { useQuery } from "@tanstack/react-query";
import { getApi } from "../../../papi/getApi";
import type { ChainIdAssetHub } from "../../../registry/chains/types";
import { parseTokenId } from "../../../registry/tokens/helpers";
import type { TokenId } from "../../../registry/tokens/types";

export const usePoolSetupCost = ({
	chainId,
	tokenId,
}: {
	chainId: ChainIdAssetHub;
	tokenId: TokenId | null | undefined;
}) =>
	useQuery({
		queryKey: ["usePoolSetupCost", chainId, tokenId],
		queryFn: async () => {
			if (!tokenId) return null;

			const api = await getApi(chainId);
			const assetAccountDeposit =
				parseTokenId(tokenId).type === "foreign-asset"
					? api.constants.ForeignAssets.AssetAccountDeposit()
					: api.constants.Assets.AssetAccountDeposit();

			const [setupFee, assetDeposit, lpTokenDeposit] = await Promise.all([
				api.constants.AssetConversion.PoolSetupFee(),
				assetAccountDeposit,
				api.constants.PoolAssets.AssetAccountDeposit(),
			]);

			return setupFee + assetDeposit + lpTokenDeposit;
		},
		structuralSharing: false,
	});
