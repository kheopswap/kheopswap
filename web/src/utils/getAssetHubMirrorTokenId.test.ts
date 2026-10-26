import { describe, expect, it } from "vitest";
import {
	getChainById,
	getChains,
	isChainIdAssetHub,
} from "../registry/chains/chains";
import { getChainIdFromTokenId, getTokenId } from "../registry/tokens/helpers";
import { KNOWN_TOKENS_MAP } from "../registry/tokens/tokens";
import type {
	Token,
	TokenForeignAsset,
	TokenHydrationAsset,
} from "../registry/tokens/types";
import type { XcmV5Multilocation } from "../registry/types/xcm";
import { getAssetHubMirrorTokenIds } from "./getAssetHubMirrorTokenId";

const assetHub = getChainById("pah");
const polkadotChains = getChains().filter(
	(chain) => chain.relay === "polkadot",
);

const getPahForeignAssetId = (symbol: string) => {
	const token = Object.values(KNOWN_TOKENS_MAP).find(
		(t) =>
			t.chainId === "pah" && t.type === "foreign-asset" && t.symbol === symbol,
	);
	if (!token) throw new Error(`pah foreign asset not found: ${symbol}`);
	return token.id;
};

const mirrorTokenIds = getAssetHubMirrorTokenIds(
	KNOWN_TOKENS_MAP,
	assetHub,
	polkadotChains,
);

describe("getAssetHubMirrorTokenIds", () => {
	it.each([
		["hydration-asset::hydration::5", "native::pah"],
		["hydration-asset::hydration::10", "asset::pah::1984"],
		["hydration-asset::hydration::22", "asset::pah::1337"],
		["hydration-asset::hydration::1000085", "asset::pah::31337"],
	])("maps %s to %s", (tokenId, expected) => {
		expect(mirrorTokenIds.get(tokenId)).toBe(expected);
	});

	it.each([
		["native::hydration", "HDX"],
		["hydration-asset::hydration::15", "vDOT"],
		["hydration-asset::hydration::1000189", "WETH"],
	])("maps %s to the pah %s foreign asset", (tokenId, symbol) => {
		expect(mirrorTokenIds.get(tokenId)).toBe(getPahForeignAssetId(symbol));
	});

	it.each([
		"hydration-asset::hydration::9",
		"hydration-asset::hydration::1001168",
		"hydration-asset::hydration::1",
	])("does not map %s", (tokenId) => {
		expect(KNOWN_TOKENS_MAP[tokenId]).toBeDefined();
		expect(mirrorTokenIds.has(tokenId)).toBe(false);
	});

	it("does not map asset hub tokens", () => {
		expect(
			[...mirrorTokenIds.keys()].filter((tokenId) =>
				isChainIdAssetHub(getChainIdFromTokenId(tokenId)),
			),
		).toEqual([]);
	});

	it.each([
		["pah", "native::ppeople", "native::pah"],
		["kah", "native::kpeople", "native::kah"],
		["wah", "native::wpeople", "native::wah"],
		["pasah", "native::paspeople", "native::pasah"],
	] as const)("on %s maps %s to %s", (assetHubId, tokenId, expected) => {
		const relayAssetHub = getChainById(assetHubId);
		const relayChains = getChains().filter(
			(chain) => chain.relay === relayAssetHub.relay,
		);
		expect(
			getAssetHubMirrorTokenIds(
				KNOWN_TOKENS_MAP,
				relayAssetHub,
				relayChains,
			).get(tokenId),
		).toBe(expected);
	});

	describe("hydration local locations", () => {
		const localLocation: XcmV5Multilocation = {
			parents: 0,
			interior: {
				type: "X2",
				value: [
					{ type: "PalletInstance", value: 99 },
					{ type: "GeneralIndex", value: 7n },
				],
			},
		};
		const reanchoredLocation: XcmV5Multilocation = {
			parents: 1,
			interior: {
				type: "X3",
				value: [
					{ type: "Parachain", value: getChainById("hydration").paraId },
					{ type: "PalletInstance", value: 99 },
					{ type: "GeneralIndex", value: 7n },
				],
			},
		};

		const foreignAsset: TokenForeignAsset = {
			id: getTokenId({
				type: "foreign-asset",
				chainId: "pah",
				location: reanchoredLocation,
			}),
			type: "foreign-asset",
			chainId: "pah",
			decimals: 8,
			symbol: "SYN",
			name: "Synthetic",
			location: reanchoredLocation,
			verified: false,
			isSufficient: false,
		};

		const hydrationAsset = (decimals: number): TokenHydrationAsset => ({
			id: getTokenId({
				type: "hydration-asset",
				chainId: "hydration",
				assetId: 999_999,
			}),
			type: "hydration-asset",
			chainId: "hydration",
			assetId: 999_999,
			decimals,
			symbol: "SYN",
			name: "Synthetic",
			location: localLocation,
			verified: false,
			isSufficient: false,
		});

		const getMirror = (token: Token) =>
			getAssetHubMirrorTokenIds(
				{ [foreignAsset.id]: foreignAsset, [token.id]: token },
				assetHub,
				polkadotChains,
			).get(token.id);

		it("re-anchors to the hydration parachain", () => {
			expect(getMirror(hydrationAsset(8))).toBe(foreignAsset.id);
		});

		it("does not map when decimals differ", () => {
			expect(getMirror(hydrationAsset(12))).toBeUndefined();
		});
	});
});
