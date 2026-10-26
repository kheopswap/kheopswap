import { kah, pah, pasah, wah } from "@polkadot-api/descriptors";
import {
	decAnyMetadata,
	u32,
	unifyMetadata,
} from "@polkadot-api/substrate-bindings";
import { firstValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import type { ChainIdAssetHub } from "../registry/chains/types";
import { ASSET_CONVERSION_LP_FEE, getTokenValuation$ } from "./prices";

vi.mock("./relay", async () => {
	const { of } = await import("rxjs");
	const usdc = { id: "asset::pah::1337", decimals: 6 };
	return {
		assetHub$: of({ id: "pah" }),
		stableToken$: of(usdc),
		relayChains$: of({ assetHub: { id: "pah" }, allChains: [] }),
	};
});

vi.mock("../services/pools/reserves", () => ({
	getPoolReserves$: () => of({ reserves: [10n, 20n], isLoading: false }),
}));

vi.mock("../papi/getApi", () => ({
	getApi: () => new Promise(() => {}),
}));

const descriptors: Record<
	ChainIdAssetHub,
	{ getMetadata: () => Promise<Uint8Array> }
> = { pah, kah, wah, pasah };

describe("getTokenValuation$", () => {
	it("values a token before the chain answers its LP fee", async () => {
		const valuation = await firstValueFrom(
			getTokenValuation$("asset::pah::30"),
		);

		expect(valuation.lpFee).toBe(ASSET_CONVERSION_LP_FEE.pah);
		expect(valuation.reservesNativeToToken).toEqual([10n, 20n]);
	});
});

describe("ASSET_CONVERSION_LP_FEE", () => {
	it.each(Object.entries(descriptors))(
		"matches the LP fee in the %s metadata",
		async (chainId, descriptor) => {
			const metadata = unifyMetadata(
				decAnyMetadata(await descriptor.getMetadata()),
			);
			const lpFee = metadata.pallets
				.find(({ name }) => name === "AssetConversion")
				?.constants.find(({ name }) => name === "LPFee")?.value;

			expect(lpFee && u32.dec(lpFee)).toBe(
				ASSET_CONVERSION_LP_FEE[chainId as ChainIdAssetHub],
			);
		},
	);
});
