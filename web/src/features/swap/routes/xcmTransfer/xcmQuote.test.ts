import {
	XcmV5Instruction,
	XcmV5Junction,
	XcmV5Junctions,
	XcmVersionedLocation,
	XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { AccountId } from "polkadot-api";
import { describe, expect, it } from "vitest";
import { getChainById } from "../../../../registry/chains/chains";
import {
	composeXcmQuote,
	type DestinationDryRun,
	describeXcmQuoteFailure,
	getXcmCallSpendings,
	type OriginDryRun,
	parseDestinationDryRun,
	parseOriginDryRun,
} from "./xcmQuote";
import {
	dotOriginFailed,
	dotSuccess,
	dotTrapped,
	usdtSuccess,
} from "./xcmTransfer.fixtures";

const HYDRATION_PARA_ID = getChainById("hydration").paraId;
const DOT = "native::pah";
const USDT = "asset::pah::1984";

const requireDestination = (destination: DestinationDryRun | undefined) => {
	if (!destination) throw new Error("fixture has no destination dry run");
	return destination;
};

type ForwardedXcms = Extract<
	OriginDryRun,
	{ success: true }
>["value"]["forwarded_xcms"];

const getForwardedXcms = (dryRun: OriginDryRun): ForwardedXcms => {
	if (!dryRun.success) throw new Error("fixture origin dry run failed");
	return dryRun.value.forwarded_xcms;
};

const withForwardedXcms = (
	dryRun: OriginDryRun,
	forwarded_xcms: ForwardedXcms,
): OriginDryRun => {
	if (!dryRun.success) throw new Error("fixture origin dry run failed");
	return { ...dryRun, value: { ...dryRun.value, forwarded_xcms } };
};

describe("parseOriginDryRun", () => {
	it.each([
		["DOT", dotSuccess, 304850000n],
		["USDT", usdtSuccess, 305450000n],
	])(
		"reads the %s message forwarded to Hydration and the DOT delivery fee",
		(_, fixture, deliveryFee) => {
			const parsed = parseOriginDryRun(fixture.origin, HYDRATION_PARA_ID);
			if (!fixture.origin.success) throw new Error("fixture origin failed");
			expect(parsed).toEqual({
				success: true,
				value: {
					message: fixture.origin.value.forwarded_xcms[0]?.[1][0],
					deliveryFee,
				},
			});
		},
	);

	it("picks the message addressed to Hydration among other destinations", () => {
		const [hydrationXcm] = getForwardedXcms(dotSuccess.origin);
		if (!hydrationXcm) throw new Error("fixture forwards nothing");
		const otherXcm: ForwardedXcms[number] = [
			XcmVersionedLocation.V5({
				parents: 1,
				interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(1002)),
			}),
			[XcmVersionedXcm.V5([XcmV5Instruction.ClearOrigin()])],
		];
		const parsed = parseOriginDryRun(
			withForwardedXcms(dotSuccess.origin, [otherXcm, hydrationXcm]),
			HYDRATION_PARA_ID,
		);
		expect(parsed.success && parsed.value.message).toBe(hydrationXcm[1][0]);
	});

	it("fails when nothing is forwarded to Hydration", () => {
		expect(
			parseOriginDryRun(
				withForwardedXcms(dotSuccess.origin, []),
				HYDRATION_PARA_ID,
			),
		).toEqual({ success: false, failure: { kind: "message-not-forwarded" } });
	});

	it("explains an origin failure caused by insufficient funds", () => {
		expect(
			parseOriginDryRun(dotOriginFailed.origin, HYDRATION_PARA_ID),
		).toEqual({
			success: false,
			failure: {
				kind: "origin-failed",
				reason: "Insufficient balance to cover the transfer and its fees",
			},
		});
	});

	it("formats any other origin dispatch error", () => {
		const parsed = parseOriginDryRun(
			{
				success: true,
				value: {
					execution_result: {
						success: false,
						value: {
							post_info: {
								actual_weight: undefined,
								pays_fee: { type: "Yes", value: undefined },
							},
							error: { type: "BadOrigin", value: undefined },
						},
					},
					emitted_events: [],
					forwarded_xcms: [],
				},
			},
			HYDRATION_PARA_ID,
		);
		expect(parsed).toEqual({
			success: false,
			failure: { kind: "origin-failed", reason: "BadOrigin" },
		});
	});
});

describe("parseDestinationDryRun", () => {
	it("counts only the DOT deposited to the beneficiary, not to the fee receiver", () => {
		expect(
			parseDestinationDryRun(requireDestination(dotSuccess.destination), {
				assetId: 5,
				beneficiary: dotSuccess.beneficiary,
			}),
		).toEqual({ success: true, value: 9995190152n });
	});

	it("counts only the USDT deposited to the beneficiary", () => {
		expect(
			parseDestinationDryRun(requireDestination(usdtSuccess.destination), {
				assetId: 10,
				beneficiary: usdtSuccess.beneficiary,
			}),
		).toEqual({ success: true, value: 9999427n });
	});

	it("matches the beneficiary whatever its address prefix", () => {
		expect(
			parseDestinationDryRun(requireDestination(dotSuccess.destination), {
				assetId: 5,
				beneficiary: AccountId(42).dec(AccountId().enc(dotSuccess.beneficiary)),
			}),
		).toEqual({ success: true, value: 9995190152n });
	});

	it("fails when no deposit reaches the beneficiary in the expected asset", () => {
		expect(
			parseDestinationDryRun(requireDestination(dotSuccess.destination), {
				assetId: 10,
				beneficiary: dotSuccess.beneficiary,
			}),
		).toEqual({ success: false, failure: { kind: "nothing-deposited" } });
	});

	it("reports trapped assets when Hydration cannot deposit below its existential deposit", () => {
		expect(
			parseDestinationDryRun(requireDestination(dotTrapped.destination), {
				assetId: 5,
				beneficiary: dotTrapped.beneficiary,
			}),
		).toEqual({
			success: false,
			failure: {
				kind: "destination-rejected",
				reason: "FailedToTransactAsset",
				assetsTrapped: true,
			},
		});
	});

	it("treats a runtime API error as unavailable, never as success", () => {
		expect(
			parseDestinationDryRun(
				{ success: false, value: { type: "Unimplemented", value: undefined } },
				{ assetId: 5, beneficiary: dotSuccess.beneficiary },
			),
		).toEqual({ success: false, failure: { kind: "destination-unavailable" } });
	});
});

describe("composeXcmQuote", () => {
	it("charges Hydration the difference between sent and received", () => {
		expect(composeXcmQuote(10_000_000_000n, 304850000n, 9995190152n)).toEqual({
			received: 9995190152n,
			deliveryFee: 304850000n,
			destinationFee: 4809848n,
		});
	});
});

describe("describeXcmQuoteFailure", () => {
	it.each([
		[{ kind: "origin-failed", reason: "Boom" }, "Boom"],
		[
			{ kind: "message-not-forwarded" },
			"The transfer would not be sent to Hydration",
		],
		[
			{ kind: "destination-unavailable" },
			"Could not simulate the transfer on Hydration",
		],
		[
			{
				kind: "destination-rejected",
				reason: "FailedToTransactAsset",
				assetsTrapped: true,
			},
			"Amount too low for Hydration: the assets would be trapped",
		],
		[
			{ kind: "destination-rejected", reason: "Barrier", assetsTrapped: false },
			"Hydration would reject the transfer: Barrier",
		],
		[{ kind: "nothing-deposited" }, "Hydration would not credit your account"],
	] as const)("%o", (failure, expected) => {
		expect(describeXcmQuoteFailure(failure)).toBe(expected);
	});
});

describe("getXcmCallSpendings", () => {
	it("adds the delivery fee to the DOT sent, keeping the account alive", () => {
		expect(
			getXcmCallSpendings({
				tokenIdIn: DOT,
				nativeTokenId: DOT,
				totalIn: 10_000_000_000n,
				deliveryFee: 304850000n,
			}),
		).toEqual({ [DOT]: { plancks: 10_304_850_000n, allowDeath: false } });
	});

	it("spends the asset sent and the DOT delivery fee separately", () => {
		expect(
			getXcmCallSpendings({
				tokenIdIn: USDT,
				nativeTokenId: DOT,
				totalIn: 10_000_000n,
				deliveryFee: 305450000n,
			}),
		).toEqual({
			[USDT]: { plancks: 10_000_000n, allowDeath: true },
			[DOT]: { plancks: 305450000n, allowDeath: false },
		});
	});

	it.each([
		[DOT, { [DOT]: { plancks: 10_000_000_000n, allowDeath: false } }],
		[USDT, { [USDT]: { plancks: 10_000_000_000n, allowDeath: true } }],
	])(
		"spends only the amount of %s while the delivery fee is unknown",
		(tokenIdIn, expected) => {
			expect(
				getXcmCallSpendings({
					tokenIdIn,
					nativeTokenId: DOT,
					totalIn: 10_000_000_000n,
					deliveryFee: undefined,
				}),
			).toEqual(expected);
		},
	);

	it("spends nothing before an amount or fee is known", () => {
		expect(
			getXcmCallSpendings({
				tokenIdIn: USDT,
				nativeTokenId: DOT,
				totalIn: null,
				deliveryFee: undefined,
			}),
		).toEqual({});
	});
});
