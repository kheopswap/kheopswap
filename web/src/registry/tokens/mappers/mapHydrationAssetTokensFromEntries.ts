import { Binary } from "polkadot-api";
import type { ChainIdHydration } from "../../chains/types.ts";
import type { XcmV5Multilocation } from "../../types/xcm.ts";
import type {
	HydrationAssetEntry,
	HydrationAssetLocationEntry,
	HydrationAssetType,
} from "./types.ts";

const HDX_ASSET_ID = 0;

const IS_LISTED_ASSET_TYPE: Record<HydrationAssetType, boolean> = {
	Token: true,
	External: true,
	XYK: false,
	StableSwap: false,
	Bond: false,
	Erc20: false,
};

export function mapHydrationAssetTokensFromEntries(
	chainId: ChainIdHydration,
	assets: HydrationAssetEntry[],
	locations: HydrationAssetLocationEntry[],
): Array<{
	type: "hydration-asset";
	chainId: ChainIdHydration;
	decimals: number;
	symbol: string;
	name: string;
	logo: undefined;
	assetId: number;
	location?: XcmV5Multilocation;
	verified: false;
	isSufficient: boolean;
}> {
	const locationByAssetId = new Map(
		locations.map((entry) => [entry.keyArgs[0], entry.value]),
	);

	return assets.flatMap(({ keyArgs: [assetId], value }) => {
		if (assetId === HDX_ASSET_ID) return [];
		if (!IS_LISTED_ASSET_TYPE[value.asset_type.type]) return [];

		const symbol = value.symbol ? Binary.toText(value.symbol) : "";
		if (!symbol || value.decimals === undefined) return [];

		const location = locationByAssetId.get(assetId);

		return [
			{
				type: "hydration-asset" as const,
				chainId,
				decimals: value.decimals,
				symbol,
				name: (value.name && Binary.toText(value.name)) || symbol,
				logo: undefined,
				assetId,
				...(location ? { location } : {}),
				verified: false as const,
				isSufficient: value.is_sufficient,
			},
		];
	});
}
