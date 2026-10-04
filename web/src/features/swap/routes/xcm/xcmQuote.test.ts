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
	dotToUsdt,
	dotToUsdtTrapped,
	usdcToDotInsufficient,
	usdcToDotNoDeal,
	usdcToUsdt,
} from "../xcmSwap/xcmSwap.fixtures";
import {
	composeXcmQuote,
	type DestinationDryRun,
	describeXcmQuoteFailure,
	getXcmCallSpendings,
	getXcmSubmitGate,
	type OriginDryRun,
	parseDeliveryFee,
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
const HYDRATION_DOT = "hydration-asset::hydration::5";
const HYDRATION_USDT = "hydration-asset::hydration::10";

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

const getLastSwapAmountOut = (dryRun: OriginDryRun) =>
	dryRun.success
		? dryRun.value.emitted_events
				.flatMap((event) =>
					event.type === "AssetConversion" &&
					event.value.type === "SwapCreditExecuted"
						? [event.value.value.amount_out]
						: [],
				)
				.at(-1)
		: undefined;

describe("parseOriginDryRun", () => {
	it.each([
		["a DOT transfer", dotSuccess.origin, dotSuccess.amount],
		["a USDT transfer", usdtSuccess.origin, usdtSuccess.amount],
		[
			"a two-hop swap",
			usdcToUsdt.origin,
			getLastSwapAmountOut(usdcToUsdt.origin),
		],
		[
			"a one-hop swap",
			dotToUsdt.origin,
			getLastSwapAmountOut(dotToUsdt.origin),
		],
	])(
		"reads the message of %s forwarded to Hydration and the amount it sends",
		(_, origin, sent) => {
			if (!origin.success) throw new Error("fixture origin failed");
			expect(sent).toBeDefined();
			expect(parseOriginDryRun(origin, HYDRATION_PARA_ID)).toEqual({
				success: true,
				value: { message: origin.value.forwarded_xcms[0]?.[1][0], sent },
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

	it("explains a swap that lacks the input token", () => {
		expect(
			parseOriginDryRun(usdcToDotInsufficient.origin, HYDRATION_PARA_ID),
		).toEqual({
			success: false,
			failure: {
				kind: "origin-failed",
				reason: "Insufficient balance to cover the transfer and its fees",
			},
		});
	});

	it("explains a swap whose output falls below its minimum", () => {
		expect(
			parseOriginDryRun(usdcToDotNoDeal.origin, HYDRATION_PARA_ID),
		).toEqual({
			success: false,
			failure: {
				kind: "origin-failed",
				reason: "The price moved beyond your slippage tolerance",
			},
		});
	});

	it("names the XCM error of any other incomplete local execution", () => {
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
							error: {
								type: "Module",
								value: {
									type: "PolkadotXcm",
									value: {
										type: "LocalExecutionIncompleteWithError",
										value: {
											index: 2,
											error: { type: "TooExpensive", value: undefined },
										},
									},
								},
							},
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
			failure: {
				kind: "origin-failed",
				reason: "Asset Hub would reject the transfer: TooExpensive",
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
				tokenId: HYDRATION_DOT,
				beneficiary: dotSuccess.beneficiary,
			}),
		).toEqual({ success: true, value: 9995190152n });
	});

	it("counts only the USDT deposited to the beneficiary", () => {
		expect(
			parseDestinationDryRun(requireDestination(usdtSuccess.destination), {
				tokenId: HYDRATION_USDT,
				beneficiary: usdtSuccess.beneficiary,
			}),
		).toEqual({ success: true, value: 9999427n });
	});

	it("matches the beneficiary whatever its address prefix", () => {
		expect(
			parseDestinationDryRun(requireDestination(dotSuccess.destination), {
				tokenId: HYDRATION_DOT,
				beneficiary: AccountId(42).dec(AccountId().enc(dotSuccess.beneficiary)),
			}),
		).toEqual({ success: true, value: 9995190152n });
	});

	it("fails when no deposit reaches the beneficiary in the expected asset", () => {
		expect(
			parseDestinationDryRun(requireDestination(dotSuccess.destination), {
				tokenId: HYDRATION_USDT,
				beneficiary: dotSuccess.beneficiary,
			}),
		).toEqual({ success: false, failure: { kind: "nothing-deposited" } });
	});

	it("reports trapped assets when Hydration cannot deposit below its existential deposit", () => {
		expect(
			parseDestinationDryRun(requireDestination(dotTrapped.destination), {
				tokenId: HYDRATION_DOT,
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

	it("counts the swap output deposited to the beneficiary", () => {
		expect(
			parseDestinationDryRun(requireDestination(usdcToUsdt.destination), {
				tokenId: HYDRATION_USDT,
				beneficiary: usdcToUsdt.sender,
			}),
		).toEqual({ success: true, value: 98764625n });
	});

	it("reports trapped assets when the swap output cannot buy execution", () => {
		expect(
			parseDestinationDryRun(requireDestination(dotToUsdtTrapped.destination), {
				tokenId: HYDRATION_USDT,
				beneficiary: dotToUsdtTrapped.sender,
			}),
		).toMatchObject({
			success: false,
			failure: { kind: "destination-rejected", assetsTrapped: true },
		});
	});

	it("treats a runtime API error as unavailable, never as success", () => {
		expect(
			parseDestinationDryRun(
				{ success: false, value: { type: "Unimplemented", value: undefined } },
				{ tokenId: HYDRATION_DOT, beneficiary: dotSuccess.beneficiary },
			),
		).toEqual({ success: false, failure: { kind: "destination-unavailable" } });
	});
});

describe("parseDeliveryFee", () => {
	it("reads the DOT Asset Hub charges to deliver the message", () => {
		if (!usdcToUsdt.deliveryFee) throw new Error("fixture has no delivery fee");
		expect(parseDeliveryFee(usdcToUsdt.deliveryFee)).toBe(305450000n);
	});

	it("gives no fee when the runtime API fails", () => {
		expect(
			parseDeliveryFee({
				success: false,
				value: { type: "Unroutable", value: undefined },
			}),
		).toBeNull();
	});

	it("gives no fee when it is charged in another asset", () => {
		expect(
			parseDeliveryFee({
				success: true,
				value: {
					type: "V5",
					value: [
						{
							id: {
								parents: 0,
								interior: XcmV5Junctions.X2([
									XcmV5Junction.PalletInstance(50),
									XcmV5Junction.GeneralIndex(1984n),
								]),
							},
							fun: { type: "Fungible", value: 1000n },
						},
					],
				},
			}),
		).toBeNull();
	});
});

describe("composeXcmQuote", () => {
	it("charges Hydration the difference between sent and received", () => {
		expect(composeXcmQuote(10_000_000_000n, 9995190152n)).toEqual({
			received: 9995190152n,
			destinationFee: 4809848n,
		});
	});
});

describe("getXcmSubmitGate", () => {
	it.each([
		[
			"closes on an error, even with a quote",
			{ errorMessage: "Boom", isLoading: false, isQuoted: true },
			{ status: "closed", reason: "Boom" },
		],
		[
			"waits while the quote loads",
			{ errorMessage: null, isLoading: true, isQuoted: false },
			{ status: "pending" },
		],
		[
			"opens on a quote",
			{ errorMessage: null, isLoading: false, isQuoted: true },
			{ status: "open" },
		],
		[
			"stays closed without a quote",
			{ errorMessage: null, isLoading: false, isQuoted: false },
			{ status: "closed", reason: "Nothing to send yet" },
		],
	] as const)("%s", (_, props, expected) => {
		expect(getXcmSubmitGate(props)).toEqual(expected);
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
		[
			{ kind: "delivery-fee-unavailable" },
			"Could not estimate the Asset Hub delivery fee",
		],
		[
			{ kind: "call-unavailable" },
			"Could not prepare the transaction on Asset Hub",
		],
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
