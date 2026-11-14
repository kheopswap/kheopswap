import {
	XcmV5Junction,
	XcmV5Junctions,
	XcmV5NetworkId,
} from "@polkadot-api/descriptors";
import { fromPairs, pickBy, uniq } from "lodash-es";
import { firstValueFrom, map, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import {
	getBridgedAssetHub,
	getChains,
	isChainAssetHub,
} from "../registry/chains/chains";
import type { ChainId, RelayId } from "../registry/chains/types";
import { getChainIdFromTokenId, getTokenId } from "../registry/tokens/helpers";
import { KNOWN_TOKENS_MAP } from "../registry/tokens/tokens";
import type { TokenId } from "../registry/tokens/types";
import type { LoadingStatus } from "../services/common";

const view = await vi.hoisted(async () => {
	const { BehaviorSubject } = await import("rxjs");
	return {
		relayId$: new BehaviorSubject<RelayId>("polkadot"),
		requestedChainIds: [] as ChainId[][],
		status: "loaded" as LoadingStatus,
	};
});

const getRelayChains = (relayId: RelayId) => {
	const allChains = getChains().filter((chain) => chain.relay === relayId);
	const assetHub = allChains.find(isChainAssetHub);
	if (!assetHub) throw new Error(`No asset hub on ${relayId}`);
	return {
		relayId,
		assetHub,
		bridgedAssetHub: getBridgedAssetHub(assetHub.id),
		allChains,
	};
};

vi.mock("./relay", () => {
	const relayChains$ = view.relayId$.pipe(map(getRelayChains));
	return {
		relayChains$,
		assetHub$: relayChains$.pipe(map(({ assetHub }) => assetHub)),
		stableToken$: of(KNOWN_TOKENS_MAP["native::pah"]),
	};
});

vi.mock("../services/tokens/service", () => ({
	getTokensByChains$: (chainIds: ChainId[]) => {
		view.requestedChainIds.push(chainIds);
		return of(
			fromPairs(
				chainIds.map((chainId) => [
					chainId,
					{
						status: view.status,
						tokens: pickBy(
							KNOWN_TOKENS_MAP,
							(token) => token.chainId === chainId,
						),
					},
				]),
			),
		);
	},
}));

const { getAllTokens$ } = await import("./tokens");
const { getAssetHubMirrorTokenId$ } = await import("./prices");

const DOT_ON_KAH = getTokenId({
	type: "foreign-asset",
	chainId: "kah",
	location: {
		parents: 2,
		interior: XcmV5Junctions.X1(
			XcmV5Junction.GlobalConsensus(XcmV5NetworkId.Polkadot()),
		),
	},
});
const KSM_ON_PAH = getTokenId({
	type: "foreign-asset",
	chainId: "pah",
	location: {
		parents: 2,
		interior: XcmV5Junctions.X1(
			XcmV5Junction.GlobalConsensus(XcmV5NetworkId.Kusama()),
		),
	},
});

const getViewTokens = (relayId: RelayId) => {
	view.relayId$.next(relayId);
	view.requestedChainIds = [];
	return firstValueFrom(getAllTokens$());
};

const getTokenIdsOn = (tokens: Record<TokenId, unknown>, chainId: ChainId) =>
	Object.keys(tokens)
		.filter((tokenId) => getChainIdFromTokenId(tokenId) === chainId)
		.sort();

describe("getAllTokens$", () => {
	it.each([
		["polkadot", "kah", [DOT_ON_KAH, "native::kah"]],
		["kusama", "pah", [KSM_ON_PAH, "native::pah"]],
	] as const)(
		"on %s adds the relay tokens of %s",
		async (relayId, bridgedAssetHubId, tokenIds) => {
			const { data } = await getViewTokens(relayId);
			expect(getTokenIdsOn(data, bridgedAssetHubId)).toEqual(
				[...tokenIds].sort(),
			);
		},
	);

	it.each(["westend", "paseo"] as const)(
		"on %s lists only the relay chains",
		async (relayId) => {
			const { data } = await getViewTokens(relayId);
			const chainIds = getChains()
				.filter((chain) => chain.relay === relayId)
				.map((chain) => chain.id);
			expect(
				uniq(Object.values(data).map((token) => token.chainId)).sort(),
			).toEqual(chainIds.sort());
		},
	);

	it.each([
		["polkadot", ["hydration", "pah", "ppeople"]],
		["kusama", ["kah", "kpeople"]],
	] as const)("on %s watches only %s", async (relayId, chainIds) => {
		await getViewTokens(relayId);
		expect(view.requestedChainIds.map((ids) => [...ids].sort())).toEqual([
			chainIds,
		]);
	});

	it.each([
		["loaded", false],
		["loading", true],
	] as const)(
		"is loading with relay chains %s: %s",
		async (status, isLoading) => {
			view.status = status;
			const tokens = await getViewTokens("polkadot");
			view.status = "loaded";
			expect(tokens.isLoading).toBe(isLoading);
		},
	);
});

describe("getAssetHubMirrorTokenId$", () => {
	it.each([
		["polkadot", "native::kah", KSM_ON_PAH],
		["polkadot", DOT_ON_KAH, "native::pah"],
		["polkadot", "native::pah", "native::pah"],
		["polkadot", KSM_ON_PAH, KSM_ON_PAH],
		["kusama", "native::pah", DOT_ON_KAH],
		["kusama", KSM_ON_PAH, "native::kah"],
		["kusama", "native::kah", "native::kah"],
	] as const)(
		"on %s prices %s through %s",
		async (relayId, tokenId, mirrorTokenId) => {
			view.relayId$.next(relayId);
			expect(await firstValueFrom(getAssetHubMirrorTokenId$(tokenId))).toBe(
				mirrorTokenId,
			);
		},
	);
});
