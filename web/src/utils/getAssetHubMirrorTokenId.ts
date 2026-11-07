import type { XcmV5Junction, XcmV5Junctions } from "@polkadot-api/descriptors";
import {
	isChainIdAssetHub,
	isChainIdHydration,
} from "../registry/chains/chains";
import type { Chain, ChainAssetHub } from "../registry/chains/types";
import { getTokenId } from "../registry/tokens/helpers";
import type { Token, TokenId } from "../registry/tokens/types";
import type { XcmV5Multilocation } from "../registry/types/xcm";

const ASSETS_PALLET_INSTANCE = 50;

export const HDX_LOCAL_LOCATION: XcmV5Multilocation = {
	parents: 0,
	interior: { type: "X1", value: { type: "GeneralIndex", value: 0n } },
};

const getJunctions = (interior: XcmV5Junctions): XcmV5Junction[] => {
	switch (interior.type) {
		case "Here":
			return [];
		case "X1":
			return [interior.value];
		default:
			return interior.value;
	}
};

const toInterior = (junctions: XcmV5Junction[]): XcmV5Junctions | undefined => {
	const [first, ...rest] = junctions;
	if (!first) return { type: "Here", value: undefined };
	if (!rest.length) return { type: "X1", value: first };
	if (junctions.length > 8) return undefined;
	return { type: `X${junctions.length}`, value: junctions } as XcmV5Junctions;
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

const toSiblingLocation = (
	location: XcmV5Multilocation,
	paraId: number,
): XcmV5Multilocation | undefined => {
	if (location.parents > 0) return location;
	const interior = toInterior([
		{ type: "Parachain", value: paraId },
		...getJunctions(location.interior),
	]);
	return interior && { parents: 1, interior };
};

const getAssetHubTokenId = (
	location: XcmV5Multilocation,
	assetHub: ChainAssetHub,
): TokenId => {
	const { parents, interior } = location;
	if (parents === 1 && interior.type === "Here")
		return getTokenId({ type: "native", chainId: assetHub.id });

	if (parents === 1 && interior.type === "X3") {
		const [parachain, pallet, index] = interior.value;
		if (
			parachain?.type === "Parachain" &&
			parachain.value === assetHub.paraId &&
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
	const paraIds = new Map(
		chains
			.filter((chain) => !isChainIdAssetHub(chain.id))
			.map((chain) => [chain.id, chain.paraId]),
	);

	for (const token of Object.values(tokens)) {
		const paraId = paraIds.get(token.chainId);
		if (paraId === undefined) continue;

		const localLocation = getLocalLocation(token);
		const location = localLocation && toSiblingLocation(localLocation, paraId);
		if (!location) continue;

		const mirrorTokenId = getAssetHubTokenId(location, assetHub);
		if (tokens[mirrorTokenId]?.decimals === token.decimals)
			mirrorTokenIds.set(token.id, mirrorTokenId);
	}

	return mirrorTokenIds;
};
