import { describe, expect, it } from "vitest";
import { getChains } from "../../registry/chains/chains";
import type { RelayId } from "../../registry/chains/types";
import { DOT_ON_KAH, KSM_ON_PAH } from "./routes/xcm/xcmBridge.fixtures";
import type { SwapFormInputs } from "./schema";
import { getDraftOnRelay } from "./swapDraft";

const getRelayChains = (relay: RelayId) =>
	getChains().filter((chain) => chain.relay === relay);
const paseoChains = getRelayChains("paseo");

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

	it.each([
		["polkadot", "pah", KSM_ON_PAH, "native::kah"],
		["polkadot", "pah", DOT_ON_KAH, "native::pah"],
		["kusama", "kah", KSM_ON_PAH, "native::kah"],
		["kusama", "kah", "native::pah", DOT_ON_KAH],
	] as const)(
		"keeps on %s a draft that crosses the bridge",
		(relay, assetHubId, tokenIdIn, tokenIdOut) => {
			const draft: SwapFormInputs = { ...polkadotDraft, tokenIdIn, tokenIdOut };
			expect(getDraftOnRelay(draft, getRelayChains(relay), assetHubId)).toBe(
				draft,
			);
		},
	);

	it("drops a draft that sits entirely on the bridged hub", () => {
		expect(
			getDraftOnRelay(polkadotDraft, getRelayChains("kusama"), "kah"),
		).toEqual({
			from: "account",
			to: "",
			tokenIdIn: "native::kah",
			tokenIdOut: "",
			amountIn: "",
		});
	});

	it("drops a draft that reaches past the bridged hub", () => {
		const draft: SwapFormInputs = {
			...polkadotDraft,
			tokenIdIn: "hydration-asset::hydration::5",
			tokenIdOut: "native::pah",
		};
		expect(
			getDraftOnRelay(draft, getRelayChains("kusama"), "kah").tokenIdIn,
		).toBe("native::kah");
	});
});
