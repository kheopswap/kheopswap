import { describe, expect, it } from "vitest";
import {
	type CoingeckoCoin,
	getCoingeckoAssetIds,
	getCoingeckoAssetPlatform,
} from "./getCoingeckoAssetIds";

const coins: CoingeckoCoin[] = [
	{ id: "aave", platforms: { hydration: "asset_registry%2F1000624" } },
	{
		id: "chainlink",
		platforms: {
			ethereum: "0x514910771af9ca656af840dff83e8264ecf986ca",
			hydration: "asset_registry%2F1000794",
		},
	},
	{
		id: "some-evm-token",
		platforms: { hydration: "0x8a598fe3e3a471ce865332e330d303502a0e2f52" },
	},
	{ id: "usd-coin", platforms: { polkadot: "1337" } },
	{
		id: "stafi",
		platforms: { polkadot: "0xef3a930e1ffffacd2fc13434ac81bd278b0ecc8d" },
	},
	{ id: "acala", platforms: { polkadot: "" } },
	{ id: "bitcoin" },
];

describe("getCoingeckoAssetIds", () => {
	it("maps the Hydration asset registry ids CoinGecko lists to their coin ids", () => {
		expect(getCoingeckoAssetIds(coins, "hydration")).toEqual(
			new Map([
				[1000624, "aave"],
				[1000794, "chainlink"],
			]),
		);
	});

	it("maps the Polkadot Asset Hub asset ids CoinGecko lists to their coin ids", () => {
		expect(getCoingeckoAssetIds(coins, "polkadot")).toEqual(
			new Map([[1337, "usd-coin"]]),
		);
	});
});

describe("getCoingeckoAssetPlatform", () => {
	it("looks up Hydration assets and Polkadot Asset Hub assets only", () => {
		expect(
			getCoingeckoAssetPlatform({
				type: "hydration-asset",
				chainId: "hydration",
			}),
		).toBe("hydration");
		expect(getCoingeckoAssetPlatform({ type: "asset", chainId: "pah" })).toBe(
			"polkadot",
		);
		expect(
			getCoingeckoAssetPlatform({ type: "asset", chainId: "kah" }),
		).toBeUndefined();
		expect(
			getCoingeckoAssetPlatform({ type: "pool-asset", chainId: "pah" }),
		).toBeUndefined();
	});
});
