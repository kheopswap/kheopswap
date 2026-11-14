import {
	isChainIdAssetHub,
	isChainIdHydration,
} from "../registry/chains/chains";
import type { Chain, ChainAssetHub } from "../registry/chains/types";
import { getTokenId } from "../registry/tokens/helpers";
import type { Token, TokenId } from "../registry/tokens/types";
import type { XcmV5Multilocation } from "../registry/types/xcm";
import { reanchorLocation } from "../registry/utils/chainLocation";

const ASSETS_PALLET_INSTANCE = 50;

export const HDX_LOCAL_LOCATION: XcmV5Multilocation = {
	parents: 0,
	interior: { type: "X1", value: { type: "GeneralIndex", value: 0n } },
};

const RELAY_TOKEN_LOCATION: XcmV5Multilocation = {
	parents: 1,
	interior: { type: "Here", value: undefined },
};

const getLocalLocation = (token: Token): XcmV5Multilocation | undefined => {
	switch (token.type) {
		case "native":
			return isChainIdHydration(token.chainId)
				? HDX_LOCAL_LOCATION
				: RELAY_TOKEN_LOCATION;
		case "hydration-asset":
			return token.location;
		default:
			return undefined;
	}
};

const getAssetHubTokenId = (
	location: XcmV5Multilocation,
	assetHub: ChainAssetHub,
): TokenId => {
	const { parents, interior } = location;
	if (parents === 1 && interior.type === "Here")
		return getTokenId({ type: "native", chainId: assetHub.id });

	if (parents === 0 && interior.type === "X2") {
		const [pallet, index] = interior.value;
		if (
			pallet?.type === "PalletInstance" &&
			pallet.value === ASSETS_PALLET_INSTANCE &&
			index?.type === "GeneralIndex"
		)
			return getTokenId({
				type: "asset",
				chainId: assetHub.id,
				assetId: Number(index.value),
			});
	}

	return getTokenId({ type: "foreign-asset", chainId: assetHub.id, location });
};

export const getAssetHubMirrorTokenIds = (
	tokens: Record<TokenId, Token>,
	assetHub: ChainAssetHub,
	chains: Chain[],
): ReadonlyMap<TokenId, TokenId> => {
	const mirrorTokenIds = new Map<TokenId, TokenId>();
	const remoteChains = new Map(
		chains
			.filter((chain) => !isChainIdAssetHub(chain.id))
			.map((chain) => [chain.id, chain]),
	);

	for (const token of Object.values(tokens)) {
		const chain = remoteChains.get(token.chainId);
		if (!chain) continue;

		const localLocation = getLocalLocation(token);
		const location =
			localLocation &&
			reanchorLocation(localLocation, { from: chain, to: assetHub });
		if (!location) continue;

		const mirrorTokenId = getAssetHubTokenId(location, assetHub);
		if (tokens[mirrorTokenId]?.decimals === token.decimals)
			mirrorTokenIds.set(token.id, mirrorTokenId);
	}

	return mirrorTokenIds;
};
