import { Binary } from "polkadot-api";
import type { AssetMetadataEntry } from "./types.ts";

export function mapAssetTokensFromEntries(
	chainId: string,
	metadatas: AssetMetadataEntry[],
	sufficientMap: Map<number, boolean>,
): Array<{
	type: "asset";
	chainId: string;
	decimals: number;
	symbol: string;
	name: string;
	logo: undefined;
	assetId: number;
	verified: false;
	isSufficient: boolean;
}> {
	return metadatas.map((entry) => {
		const assetId = entry.keyArgs[0];
		return {
			type: "asset",
			chainId,
			decimals: entry.value.decimals,
			symbol: Binary.toText(entry.value.symbol),
			name: Binary.toText(entry.value.name),
			logo: undefined,
			assetId,
			verified: false,
			isSufficient: sufficientMap.get(assetId) ?? false,
		};
	});
}
