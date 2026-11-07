import { describe, expect, it } from "vitest";
import type { Token } from "../registry/tokens/types";
import { getFeeAssetLocation } from "./getFeeAssetLocation";

const ethereumLocation = {
	parents: 2,
	interior: {
		type: "X1",
		value: {
			type: "GlobalConsensus",
			value: { type: "Ethereum", value: { chain_id: 11155111n } },
		},
	},
};

const foreignEth = {
	id: "foreign-asset::pasah::eth",
	type: "foreign-asset",
	chainId: "pasah",
	symbol: "ETH",
	isSufficient: true,
	location: ethereumLocation,
} as unknown as Token;

describe("getFeeAssetLocation", () => {
	it("pays the fee in a sufficient foreign asset at its own location", () => {
		expect(getFeeAssetLocation(foreignEth)).toBe(ethereumLocation);
	});

	it("refuses a foreign asset that is not sufficient", () => {
		expect(() =>
			getFeeAssetLocation({ ...foreignEth, isSufficient: false } as Token),
		).toThrow("not sufficient");
	});

	it("leaves the native token on the default fee payment", () => {
		expect(
			getFeeAssetLocation({ id: "native::pasah", type: "native" } as Token),
		).toBeUndefined();
	});
});
