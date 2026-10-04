import { XcmV5Junction, XcmV5Junctions } from "@polkadot-api/descriptors";
import { describe, expect, it } from "vitest";
import { mapHydrationAssetTokensFromEntries } from "./mapHydrationAssetTokensFromEntries";
import type {
	HydrationAssetEntry,
	HydrationAssetLocationEntry,
	HydrationAssetType,
} from "./types";

const text = (value: string) => new TextEncoder().encode(value);

const asset = (
	assetId: number,
	type: HydrationAssetType,
	metadata: { symbol?: string; name?: string; decimals?: number } = {
		symbol: `T${assetId}`,
		name: `Token ${assetId}`,
		decimals: 12,
	},
	isSufficient = false,
): HydrationAssetEntry => ({
	keyArgs: [assetId],
	value: {
		asset_type: { type },
		symbol: metadata.symbol === undefined ? undefined : text(metadata.symbol),
		name: metadata.name === undefined ? undefined : text(metadata.name),
		decimals: metadata.decimals,
		is_sufficient: isSufficient,
	},
});

const usdtLocation: HydrationAssetLocationEntry = {
	keyArgs: [10],
	value: {
		parents: 1,
		interior: XcmV5Junctions.X3([
			XcmV5Junction.Parachain(1000),
			XcmV5Junction.PalletInstance(50),
			XcmV5Junction.GeneralIndex(1984n),
		]),
	},
};

const mapAssetIds = (assets: HydrationAssetEntry[]) =>
	mapHydrationAssetTokensFromEntries("hydration", assets, []).map(
		(token) => token.assetId,
	);

describe("mapHydrationAssetTokensFromEntries", () => {
	it("keeps Token and External assets and drops other asset types", () => {
		expect(
			mapAssetIds([
				asset(5, "Token"),
				asset(1000, "External"),
				asset(2000, "XYK"),
				asset(3000, "StableSwap"),
				asset(4000, "Bond"),
				asset(5000, "Erc20"),
			]),
		).toEqual([5, 1000]);
	});

	it("drops HDX, which is the native token", () => {
		expect(mapAssetIds([asset(0, "Token"), asset(5, "Token")])).toEqual([5]);
	});

	it("drops assets without symbol or decimals", () => {
		expect(
			mapAssetIds([
				asset(1, "External", {}),
				asset(2, "Token", { name: "No symbol", decimals: 12 }),
				asset(3, "Token", { symbol: "NODEC", name: "No decimals" }),
				asset(4, "Token", { symbol: "", name: "Empty symbol", decimals: 6 }),
			]),
		).toEqual([]);
	});

	it("decodes metadata and falls back to the symbol when name is missing", () => {
		expect(
			mapHydrationAssetTokensFromEntries(
				"hydration",
				[
					asset(
						5,
						"Token",
						{ symbol: "DOT", name: "Polkadot", decimals: 10 },
						true,
					),
					asset(15, "Token", { symbol: "vDOT", decimals: 10 }),
				],
				[],
			),
		).toEqual([
			{
				type: "hydration-asset",
				chainId: "hydration",
				decimals: 10,
				symbol: "DOT",
				name: "Polkadot",
				logo: undefined,
				assetId: 5,
				verified: false,
				isSufficient: true,
			},
			{
				type: "hydration-asset",
				chainId: "hydration",
				decimals: 10,
				symbol: "vDOT",
				name: "vDOT",
				logo: undefined,
				assetId: 15,
				verified: false,
				isSufficient: false,
			},
		]);
	});

	it("attaches the location only to assets that have one", () => {
		const [usdt, dot] = mapHydrationAssetTokensFromEntries(
			"hydration",
			[asset(10, "Token"), asset(5, "Token")],
			[usdtLocation],
		);

		expect(usdt?.location).toEqual(usdtLocation.value);
		expect(dot).not.toHaveProperty("location");
	});
});
