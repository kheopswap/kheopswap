import { describe, expect, it } from "vitest";
import {
	dotToAssetHub,
	dotToAssetHubDotFeePayer,
} from "../features/swap/routes/xcm/xcmFromHydration.fixtures";
import {
	convertHydrationFee,
	getHydrationFeeCurrencyTokenId,
} from "./hydrationFees";

const requireFee = (fee: (typeof dotToAssetHub)["fee"]) => {
	if (!fee) throw new Error("fixture has no fee");
	return fee;
};

describe("convertHydrationFee", () => {
	it("charges a DOT payer the HDX fee at the runtime's weight price, rounded up", () => {
		const fee = requireFee(dotToAssetHubDotFeePayer.fee);
		expect(fee.currency).toBe(5);
		expect(
			convertHydrationFee(fee.hdx, {
				hdx: fee.refHdx,
				currency: fee.refCurrency,
			}),
		).toBe(35052000n);
	});

	it("leaves the fee unchanged when the currency is priced like HDX", () => {
		const fee = requireFee(dotToAssetHub.fee);
		expect(
			convertHydrationFee(fee.hdx, {
				hdx: fee.refHdx,
				currency: fee.refCurrency,
			}),
		).toBe(fee.hdx);
	});

	it("divides by the HDX price, not the currency price", () => {
		expect(convertHydrationFee(10n, { hdx: 3n, currency: 1n })).toBe(4n);
	});
});

describe("getHydrationFeeCurrencyTokenId", () => {
	it.each([
		[undefined, "native::hydration"],
		[0, "native::hydration"],
		[5, "hydration-asset::hydration::5"],
		[10, "hydration-asset::hydration::10"],
	])("maps account currency %s to %s", (assetId, expected) => {
		expect(getHydrationFeeCurrencyTokenId("hydration", assetId)).toBe(expected);
	});
});
