import { renderHook } from "@testing-library/react";
import { map, of } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenId } from "../registry/tokens/types";
import { useStablePlancks, useStablePrice } from "./useStablePrice";

const ASSET_HUB_PAS = "native::pasah";
const PEOPLE_PAS = "native::paspeople";

const paseo = await vi.hoisted(async () => {
	const { BehaviorSubject } = await import("rxjs");
	const { getChainById, getChains } = await import("../registry/chains/chains");
	const { KNOWN_TOKENS_MAP } = await import("../registry/tokens/tokens");
	const assetHub = getChainById("pasah");
	const allChains = getChains().filter((chain) => chain.relay === "paseo");
	const stableToken = KNOWN_TOKENS_MAP["native::pasah"];
	const peopleToken = KNOWN_TOKENS_MAP["native::paspeople"];
	if (!stableToken || !peopleToken) throw new Error("Paseo PAS not found");
	return {
		relayChains: { relayId: "paseo", assetHub, allChains, stableToken },
		tokens: { [stableToken.id]: stableToken, [peopleToken.id]: peopleToken },
		tokenStatus: new BehaviorSubject("loaded"),
	};
});

vi.mock("../state/relay", () => ({
	relayChains$: of(paseo.relayChains),
	assetHub$: of(paseo.relayChains.assetHub),
	stableToken$: of(paseo.relayChains.stableToken),
	useRelayChains: () => paseo.relayChains,
}));

vi.mock("../state/tokens", async () => {
	const { getAssetHubMirrorTokenIds } = await import(
		"../utils/getAssetHubMirrorTokenId"
	);
	const { assetHub, allChains } = paseo.relayChains;
	return {
		getAllTokens$: () => of({ isLoading: false, data: paseo.tokens }),
		viewTokens$: of({
			isLoading: false,
			tokens: paseo.tokens,
			mirrorTokenIds: getAssetHubMirrorTokenIds(
				paseo.tokens,
				assetHub,
				allChains,
			),
		}),
	};
});

vi.mock("../services/tokens/service", () => ({
	getTokenById$: (tokenId: TokenId) =>
		paseo.tokenStatus.pipe(
			map((status) => ({ status, token: paseo.tokens[tokenId] })),
		),
}));

vi.mock("../state/convert", () => ({
	getAssetConvert$: ({
		tokenIdIn,
		tokenIdOut,
		plancksIn,
	}: {
		tokenIdIn: TokenId;
		tokenIdOut: TokenId;
		plancksIn: bigint;
	}) =>
		of({
			tokenIdIn,
			tokenIdOut,
			plancksIn,
			plancksOut:
				tokenIdIn === ASSET_HUB_PAS && tokenIdOut === ASSET_HUB_PAS
					? plancksIn
					: null,
			isLoading: false,
		}),
}));

beforeEach(() => paseo.tokenStatus.next("loaded"));

describe("useStablePlancks on a People chain token", () => {
	it("values it through its Asset Hub mirror", () => {
		const { result } = renderHook(() =>
			useStablePlancks({ tokenId: PEOPLE_PAS, plancks: 25_000_000_000n }),
		);

		expect(result.current.isLoading).toBe(false);
		expect(result.current.token?.id).toBe(PEOPLE_PAS);
		expect(result.current.stableToken?.id).toBe(ASSET_HUB_PAS);
		expect(result.current.stablePlancks).toBe(25_000_000_000n);
	});
});

describe("useStablePlancks while the token registry reloads", () => {
	it("keeps a finished conversion out of the loading state", () => {
		paseo.tokenStatus.next("loading");
		const { result } = renderHook(() =>
			useStablePlancks({ tokenId: PEOPLE_PAS, plancks: 25_000_000_000n }),
		);

		expect(result.current.isLoading).toBe(false);
		expect(result.current.stablePlancks).toBe(25_000_000_000n);
	});
});

describe("useStablePrice on a People chain token", () => {
	it("prices it through its Asset Hub mirror", () => {
		const { result } = renderHook(() =>
			useStablePrice({ tokenId: PEOPLE_PAS, plancks: 25_000_000_000n }),
		);

		expect(result.current.isLoading).toBe(false);
		expect(result.current.stableToken?.id).toBe(ASSET_HUB_PAS);
		expect(result.current.price).toBe("2.5");
	});
});
