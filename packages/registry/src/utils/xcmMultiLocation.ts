import { XcmV5Junction, XcmV5Junctions } from "@polkadot-api/descriptors";
import { type ChainId, isChainIdAssetHub } from "../chains";
import { getTokenId, parseTokenId, type TokenId } from "../tokens";
import type { XcmV5Multilocation } from "../types";

type MultilocationV5<T> = T extends TokenId ? XcmV5Multilocation : null;

// TODO take parent chain into account
export const getXcmV5MultilocationFromTokenId = <
	T extends TokenId | null | undefined,
>(
	tokenId: T,
): MultilocationV5<T> => {
	if (!tokenId) return null as MultilocationV5<T>;

	const parsed = parseTokenId(tokenId);

	if (parsed.type === "native")
		return {
			parents: 1,
			interior: XcmV5Junctions.Here(),
		} as MultilocationV5<T>;

	if (parsed.type === "asset")
		return {
			parents: 0,
			interior: XcmV5Junctions.X2([
				XcmV5Junction.PalletInstance(50),
				XcmV5Junction.GeneralIndex(BigInt(parsed.assetId)),
			]),
		} as MultilocationV5<T>;

	if (parsed.type === "foreign-asset")
		return parsed.location as MultilocationV5<T>;

	throw new Error(`Invalid token type: ${parsed.type}`);
};

export const getTokenIdFromXcmV5Multilocation = (
	chainId: ChainId,
	multilocation: XcmV5Multilocation,
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
