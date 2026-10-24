import { describe, expect, it } from "vitest";
import { getChains } from "../../registry/chains/chains";
import { getDraftOnRelay } from "./swapDraft";

const paseoChains = getChains().filter((chain) => chain.relay === "paseo");

const polkadotDraft = {
	from: "account",
	to: "",
	tokenIdIn: "native::pah",
	tokenIdOut: "asset::pah::1337",
	amountIn: "0.1",
} as const;

describe("getDraftOnRelay", () => {
	it("drops the amount with the tokens of another network", () => {
		expect(getDraftOnRelay(polkadotDraft, paseoChains, "pasah")).toEqual({
			from: "account",
			to: "",
			tokenIdIn: "native::pasah",
			tokenIdOut: "",
			amountIn: "",
		});
	});

	it("keeps a draft made on the same network", () => {
		const paseoDraft = {
			...polkadotDraft,
			tokenIdIn: "native::pasah",
			tokenIdOut: "",
		} as const;
		expect(getDraftOnRelay(paseoDraft, paseoChains, "pasah")).toBe(paseoDraft);
	});
});
