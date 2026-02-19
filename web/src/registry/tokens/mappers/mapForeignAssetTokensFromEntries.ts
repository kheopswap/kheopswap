import { Binary } from "polkadot-api";
import { safeStringify } from "../../../utils/serialization.ts";
import { isEthereumOriginLocation } from "./isEthereumOriginLocation.ts";
import type {
	ForeignAssetEntry,
	ForeignAssetLocation,
	ForeignMetadataEntry,
} from "./types.ts";

export function mapForeignAssetTokensFromEntries<
	Location extends ForeignAssetLocation,
>(
	chainId: string,
	assets: ForeignAssetEntry<Location>[],
	metadatas: ForeignMetadataEntry<Location>[],
	options?: { keepEthereumWithoutMetadata?: boolean },
): Array<{
	type: "foreign-asset";
	chainId: string;
	decimals: number;
	symbol: string;
	name: string;
	logo: undefined;
	location: Location;
	verified: false;
	isSufficient: boolean;
}> {
	return assets
		.map((asset) => {
			const location = asset.keyArgs[0];
			const metadata = metadatas.find(
				(meta) =>
					safeStringify(meta.keyArgs[0]) === safeStringify(asset.keyArgs[0]),
			)?.value;
			const symbol = metadata ? Binary.toText(metadata.symbol) : "";
			const decimals = metadata?.decimals ?? 0;
			const name = metadata ? Binary.toText(metadata.name) : "";
			const isSufficient = asset.value.is_sufficient ?? false;
			return {
				type: "foreign-asset" as const,
				chainId,
				decimals,
				symbol,
				name,
				logo: undefined,
				location,
				verified: false as const,
				isSufficient,
			};
		})
		.filter((token) => {
			if (token.symbol && token.name) return true;
			if (!options?.keepEthereumWithoutMetadata) return false;
			return isEthereumOriginLocation(token.location);
		});
}
