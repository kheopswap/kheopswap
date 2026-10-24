import { XcmV5Junction, XcmV5Junctions } from "@polkadot-api/descriptors";
import { isChainIdHydration } from "../chains/chains";
import type { ChainIdAssetHub } from "../chains/types";
import { getTokenId, parseTokenId } from "../tokens/helpers";
import type { TokenId } from "../tokens/types";
import type { XcmV5Multilocation } from "../types/xcm";

export const getXcmV5MultilocationFromTokenId = (
	tokenId: TokenId,
): XcmV5Multilocation => {
	const parsed = parseTokenId(tokenId);
	if (isChainIdHydration(parsed.chainId))
		throw new Error(`No Asset Hub location for ${tokenId}`);

	switch (parsed.type) {
		case "native":
			return { parents: 1, interior: XcmV5Junctions.Here() };
		case "asset":
			return {
				parents: 0,
				interior: XcmV5Junctions.X2([
					XcmV5Junction.PalletInstance(50),
					XcmV5Junction.GeneralIndex(BigInt(parsed.assetId)),
				]),
			};
		case "foreign-asset":
			return parsed.location;
		default:
			throw new Error(`No Asset Hub location for ${tokenId}`);
	}
};

export const getTokenIdFromXcmV5Multilocation = (
	chainId: ChainIdAssetHub,
	multilocation: XcmV5Multilocation,
): TokenId => {
	const { interior } = multilocation;
	if (interior.type === "Here") return `native::${chainId}`;

	if (
		interior.type === "X2" &&
		interior.value.some((e) => e.type === "PalletInstance" && e.value === 50)
	)
		for (const entry of interior.value)
			if (entry.type === "GeneralIndex")
				return getTokenId({
					type: "asset",
					chainId,
					assetId: Number(entry.value),
				});

	return getTokenId({
		type: "foreign-asset",
		chainId,
		location: multilocation,
	});
};
