import type { PoolAssetEntry } from "./types.ts";

export function mapPoolAssetTokensFromEntries(
	chainId: string,
	entries: PoolAssetEntry[],
): Array<{
	type: "pool-asset";
	chainId: string;
	decimals: 0;
	symbol: "";
	name: "";
	logo: undefined;
	poolAssetId: number;
	isSufficient: false;
}> {
	return entries.map((entry) => ({
		type: "pool-asset",
		chainId,
		decimals: 0,
		symbol: "",
		name: "",
		logo: undefined,
		poolAssetId: entry.keyArgs[0],
		isSufficient: false,
	}));
}
