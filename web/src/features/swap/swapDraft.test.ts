import { describe, expect, it } from "vitest";
import { getChains } from "../../registry/chains/chains";
import type { SwapFormInputs } from "./schema";
import { getDraftOnRelay } from "./swapDraft";

const paseoChains = getChains().filter((chain) => chain.relay === "paseo");

const polkadotDraft: SwapFormInputs = {
	from: "account",
	to: "",
	tokenIdIn: "native::pah",
	tokenIdOut: "asset::pah::1337",
	amountIn: "100",
};

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
		const paseoDraft: SwapFormInputs = {
			...polkadotDraft,
			tokenIdIn: "native::pasah",
			tokenIdOut: "",
		};
		expect(getDraftOnRelay(paseoDraft, paseoChains, "pasah")).toBe(paseoDraft);
	});
});
