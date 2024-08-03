import { XcmV3Junction, XcmV3Junctions } from "@polkadot-api/descriptors";

import { type ChainId, isChainIdAssetHub } from "src/config/chains";
import { type TokenId, getTokenId, parseTokenId } from "src/config/tokens";
import type { XcmV3Multilocation } from "src/types";

type Multilocation<T> = T extends TokenId ? XcmV3Multilocation : null;

// TODO conditional result type
export const getXcmV3MultilocationFromTokenId = <
	T extends TokenId | null | undefined,
>(
	tokenId: T,
): Multilocation<T> => {
	if (!tokenId) return null as Multilocation<T>;

	const parsed = parseTokenId(tokenId);

	if (parsed.type === "native")
		return {
			parents: 1,
			interior: XcmV3Junctions.Here(),
		} as Multilocation<T>;

	if (parsed.type === "asset")
		return {
			parents: 0,
			interior: XcmV3Junctions.X2([
				XcmV3Junction.PalletInstance(50),
				XcmV3Junction.GeneralIndex(BigInt(parsed.assetId)),
			]),
		} as Multilocation<T>;

	if (parsed.type === "foreign-asset")
		return parsed.location as Multilocation<T>;

	throw new Error(`Invalid token type: ${parsed.type}`);
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
