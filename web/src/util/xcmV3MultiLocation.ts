import { XcmV3Junctions, XcmV3Junction } from "@polkadot-api/descriptors";

import { TokenId, getTokenId, parseTokenId } from "src/config/tokens";
import { ChainId, isChainIdAssetHub } from "src/config/chains";
import { XcmV3Multilocation } from "src/types";

export const getXcmV3MultilocationFromTokenId = (
	tokenId: TokenId | null | undefined,
): XcmV3Multilocation | null => {
	if (!tokenId) return null;

	const parsed = parseTokenId(tokenId);

	if (parsed.type === "native")
		return {
			parents: 1,
			interior: XcmV3Junctions.Here(),
		};

	if (parsed.type === "asset")
		return {
			parents: 0,
			interior: XcmV3Junctions.X2([
				XcmV3Junction.PalletInstance(50),
				XcmV3Junction.GeneralIndex(BigInt(parsed.assetId)),
			]),
		};

	if (parsed.type === "foreign-asset") return parsed.location;

	return null;
};

export const getTokenIdFromXcmV3Multilocation = (
	chainId: ChainId,
	multilocation: XcmV3Multilocation,
): TokenId | null => {
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

	if (isChainIdAssetHub(chainId))
		return getTokenId({
			type: "foreign-asset",
			chainId,
			location: multilocation,
		});

	return null;
};
