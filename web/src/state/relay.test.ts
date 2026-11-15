import { firstValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import type { RelayId } from "../registry/chains/types";
import type { TokenId } from "../registry/tokens/types";

const relayId$ = await vi.hoisted(async () => {
	const { BehaviorSubject } = await import("rxjs");
	return new BehaviorSubject<RelayId>("polkadot");
});

vi.mock("./location", () => ({ relayId$ }));

vi.mock("../registry/chains/chains", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../registry/chains/chains")>();
	const reversedChains = [...actual.getChains()].reverse();
	return { ...actual, getChains: () => reversedChains };
});

vi.mock("../services/tokens/service", () => ({
	getTokenById$: (id: TokenId) =>
		of({ status: "loaded", token: { id, symbol: "STABLE" } }),
}));

const { relayChains$ } = await import("./relay");

const getRelayChains = (relayId: RelayId) => {
	relayId$.next(relayId);
	return firstValueFrom(relayChains$);
};

describe("relayChains$", () => {
	it.each([
		["polkadot", "pah", "kah", ["hydration", "pah", "ppeople"]],
		["kusama", "kah", "pah", ["kah", "kpeople"]],
		["westend", "wah", undefined, ["wah", "wpeople"]],
		["paseo", "pasah", undefined, ["pasah", "paspeople"]],
	] as const)(
		"on %s picks %s as hub and %s as bridged hub",
		async (relayId, assetHubId, bridgedAssetHubId, chainIds) => {
			const { assetHub, bridgedAssetHub, allChains } =
				await getRelayChains(relayId);
			expect(assetHub.id).toBe(assetHubId);
			expect(bridgedAssetHub?.id).toBe(bridgedAssetHubId);
			expect(allChains.map((chain) => chain.id).sort()).toEqual(chainIds);
		},
	);
});
