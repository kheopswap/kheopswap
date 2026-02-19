import type { ForeignAssetLocation } from "./types.ts";

export function isEthereumOriginLocation(
	location: ForeignAssetLocation,
): boolean {
	const interior = location?.interior;
	if (interior?.type !== "X2") return false;
	if (!Array.isArray(interior.value)) return false;

	const [junction0, junction1] = interior.value as Array<{
		type?: string;
		value?: { type?: string };
	}>;

	return (
		junction0?.type === "GlobalConsensus" &&
		junction0.value?.type === "Ethereum" &&
		junction1?.type === "AccountKey20"
	);
}
