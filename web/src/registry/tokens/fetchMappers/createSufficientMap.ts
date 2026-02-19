import type { AssetInfoEntry } from "./types.ts";

export function createSufficientMap(
	assets: AssetInfoEntry[],
): Map<number, boolean> {
	const map = new Map<number, boolean>();
	for (const asset of assets) {
		map.set(asset.keyArgs[0], asset.value.is_sufficient);
	}
	return map;
}
