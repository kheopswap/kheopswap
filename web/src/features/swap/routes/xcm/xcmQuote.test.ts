import {
	XcmV5Instruction,
	XcmV5Junction,
	XcmV5Junctions,
	XcmVersionedLocation,
	XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { AccountId } from "polkadot-api";
import { describe, expect, it } from "vitest";
import type { DryRun } from "../../../../hooks/useDryRun";
import {
	dotToUsdt,
	dotToUsdtTrapped,
	usdcToDotInsufficient,
	usdcToDotNoDeal,
	usdcToUsdt,
} from "../xcmSwap/xcmSwap.fixtures";
import {
	type BridgeTransferFixture,
	DOT_ON_KAH,
	dotKusamaToPolkadot,
	dotPolkadotToKusama,
	KSM_ON_PAH,
	ksmKusamaToPolkadot,
	ksmPolkadotToKusama,
	ksmPolkadotToKusamaWithoutDot,
} from "./xcmBridge.fixtures";
import {
	dotToAssetHub,
	dotToAssetHubDotFeePayer,
	dotToAssetHubTrapped,
	pinkToAssetHubInsufficient,
	usdcToAssetHub,
	usdtToAssetHub,
} from "./xcmFromHydration.fixtures";
import {
	dotFromPeople,
	dotFromPeopleTrapped,
	ksmFromPeople,
	pasFromPeopleRejected,
	wndFromPeople,
} from "./xcmFromPeople.fixtures";
import {
	dotHydrationToPeople,
	dotPeopleToHydration,
	dotPeopleToHydrationTrappedOnHub,
} from "./xcmHubTransfer.fixtures";
import {
	composeXcmQuote,
	type DestinationDryRun,
	describeXcmQuoteFailure,
	getDeliveryFeeTokenId,
	getXcmCallSpendings,
	getXcmSubmitGate,
	type HubDryRun,
	type OriginDryRun,
	parseDeliveryFee,
	parseDestinationDryRun,
	parseHubDryRun,
	parseOriginDryRun,
} from "./xcmQuote";
import {
	dotToPeople,
	dotToPeopleTrapped,
	ksmToPeople,
	pasToPeople,
} from "./xcmToPeople.fixtures";
import {
	dotOriginFailed,
	dotSuccess,
	dotTrapped,
	usdtSuccess,
} from "./xcmTransfer.fixtures";

const AH_TO_HYDRATION = { from: "pah", to: "hydration" } as const;
const HYDRATION_TO_AH = { from: "hydration", to: "pah" } as const;
const DOT = "native::pah";
const USDT = "asset::pah::1984";
const HYDRATION_DOT = "hydration-asset::hydration::5";
const HYDRATION_USDT = "hydration-asset::hydration::10";

const getTransferFee = (tokenIdOut: string, sent: bigint, received: bigint) =>
	composeXcmQuote(
		{
			route: {
				kind: "xcm-transfer",
				origin: "pah",
				destination: "hydration",
				tokenIdIn: tokenIdOut,
				tokenIdOut,
			},
		},
		{ sent, received },
	).destinationFee;

const requireDestination = (
	destination: DestinationDryRun | null | undefined,
) => {
	if (!destination) throw new Error("fixture has no destination dry run");
	return destination;
};

type AssetHubDryRun = DryRun<"pah">;

type ForwardedXcms = Extract<
	AssetHubDryRun,
	{ success: true }
>["value"]["forwarded_xcms"];

const getForwardedXcms = (dryRun: AssetHubDryRun): ForwardedXcms => {
	if (!dryRun.success) throw new Error("fixture origin dry run failed");
	return dryRun.value.forwarded_xcms;
};

const withForwardedXcms = (
	dryRun: AssetHubDryRun,
	forwarded_xcms: ForwardedXcms,
): AssetHubDryRun => {
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
			expect(parseOriginDryRun(origin, AH_TO_HYDRATION)).toEqual({
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
			AH_TO_HYDRATION,
		);
		expect(parsed.success && parsed.value.message).toBe(hydrationXcm[1][0]);
	});

	it("fails when nothing is forwarded to Hydration", () => {
		expect(
			parseOriginDryRun(
				withForwardedXcms(dotSuccess.origin, []),
				AH_TO_HYDRATION,
			),
		).toEqual({ success: false, failure: { kind: "message-not-forwarded" } });
	});

	it("explains an origin failure caused by insufficient funds", () => {
		expect(parseOriginDryRun(dotOriginFailed.origin, AH_TO_HYDRATION)).toEqual({
			success: false,
			failure: {
				kind: "origin-failed",
				reason: "Insufficient balance to cover the transfer and its fees",
			},
		});
	});

	it("explains a swap that lacks the input token", () => {
		expect(
			parseOriginDryRun(usdcToDotInsufficient.origin, AH_TO_HYDRATION),
		).toEqual({
			success: false,
			failure: {
				kind: "origin-failed",
				reason: "Insufficient balance to cover the transfer and its fees",
			},
		});
	});

	it("explains a swap whose output falls below its minimum", () => {
		expect(parseOriginDryRun(usdcToDotNoDeal.origin, AH_TO_HYDRATION)).toEqual({
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
			AH_TO_HYDRATION,
		);
		expect(parsed).toEqual({
			success: false,
			failure: { kind: "origin-rejected", xcmError: "TooExpensive" },
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
			AH_TO_HYDRATION,
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
		expect(getTransferFee(HYDRATION_DOT, 10_000_000_000n, 9995190152n)).toEqual(
			{ tokenId: HYDRATION_DOT, plancks: 4809848n },
		);
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
	const toHydration = { origin: "pah", destination: "hydration" } as const;

	it.each([
		[
			{ kind: "origin-unavailable" },
			"Could not simulate the transfer on Polkadot Asset Hub",
		],
		[{ kind: "origin-failed", reason: "Boom" }, "Boom"],
		[
			{ kind: "origin-rejected", xcmError: "TooExpensive" },
			"Polkadot Asset Hub would reject the transfer: TooExpensive",
		],
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
			"Could not estimate the Polkadot Asset Hub delivery fee",
		],
		[
			{ kind: "call-unavailable" },
			"Could not prepare the transaction on Polkadot Asset Hub",
		],
	] as const)("%o", (failure, expected) => {
		expect(describeXcmQuoteFailure(failure, toHydration)).toBe(expected);
	});
});

describe("getXcmCallSpendings", () => {
	it("adds the delivery fee to the DOT sent, keeping the account alive", () => {
		expect(
			getXcmCallSpendings({
				tokenIdIn: DOT,
				totalIn: 10_000_000_000n,
				deliveryFee: { tokenId: DOT, plancks: 304850000n },
			}),
		).toEqual({ [DOT]: { plancks: 10_304_850_000n, allowDeath: false } });
	});

	it("spends the asset sent and the DOT delivery fee separately", () => {
		expect(
			getXcmCallSpendings({
				tokenIdIn: USDT,
				totalIn: 10_000_000n,
				deliveryFee: { tokenId: DOT, plancks: 305450000n },
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
				totalIn: null,
				deliveryFee: undefined,
			}),
		).toEqual({});
	});
});

describe("Hydration to Asset Hub", () => {
	const DOT_AH = "native::pah";
	const fromHydration = { origin: "hydration", destination: "pah" } as const;

	it.each([
		["DOT", dotToAssetHub],
		["USDT", usdtToAssetHub],
		["USDC", usdcToAssetHub],
	])(
		"reads the %s withdrawn into the message forwarded to Asset Hub",
		(_, fixture) => {
			if (!fixture.origin.success) throw new Error("fixture origin failed");
			expect(parseOriginDryRun(fixture.origin, HYDRATION_TO_AH)).toEqual({
				success: true,
				value: {
					message: fixture.origin.value.forwarded_xcms[0]?.[1][0],
					sent: fixture.amount,
				},
			});
		},
	);

	it("explains a sender lacking the asset", () => {
		expect(
			parseOriginDryRun(pinkToAssetHubInsufficient.origin, HYDRATION_TO_AH),
		).toEqual({
			success: false,
			failure: {
				kind: "origin-failed",
				reason: "Insufficient balance to cover the transfer and its fees",
			},
		});
	});

	it("reads a free delivery from Hydration as zero, not as unavailable", () => {
		if (!dotToAssetHub.deliveryFees)
			throw new Error("fixture has no delivery fee");
		expect(parseDeliveryFee(dotToAssetHub.deliveryFees)).toBe(0n);
	});

	it.each([
		["DOT", dotToAssetHub, DOT_AH, 9991650007n, 8349993n],
		[
			"DOT to a new account",
			dotToAssetHubDotFeePayer,
			DOT_AH,
			9991650007n,
			8349993n,
		],
		["USDT", usdtToAssetHub, "asset::pah::1984", 9999003n, 997n],
		["USDC", usdcToAssetHub, "asset::pah::1337", 9999000n, 1000n],
	])(
		"quotes the %s received on Asset Hub and the fee Asset Hub keeps",
		(_, fixture, tokenId, received, destinationFee) => {
			const parsed = parseDestinationDryRun(
				requireDestination(fixture.destination),
				{ tokenId, beneficiary: fixture.beneficiary },
			);
			expect(parsed).toEqual({ success: true, value: received });
			expect(getTransferFee(tokenId, fixture.amount, received)).toEqual({
				tokenId,
				plancks: destinationFee,
			});
		},
	);

	it("reports trapped assets when the amount cannot endow an empty Asset Hub account", () => {
		const parsed = parseDestinationDryRun(
			requireDestination(dotToAssetHubTrapped.destination),
			{ tokenId: DOT_AH, beneficiary: dotToAssetHubTrapped.beneficiary },
		);
		expect(parsed).toEqual({
			success: false,
			failure: {
				kind: "destination-rejected",
				reason: "FailedToTransactAsset",
				assetsTrapped: true,
			},
		});
		if (parsed.success) throw new Error("expected a failure");
		expect(describeXcmQuoteFailure(parsed.failure, fromHydration)).toBe(
			"Amount too low for Polkadot Asset Hub: the assets would be trapped",
		);
	});

	it("names Hydration when it would reject the transfer", () => {
		expect(
			describeXcmQuoteFailure(
				{ kind: "origin-rejected", xcmError: "TooExpensive" },
				fromHydration,
			),
		).toBe("Hydration would reject the transfer: TooExpensive");
	});

	it("labels the delivery fee in Hydration DOT", () => {
		expect(getDeliveryFeeTokenId("hydration")).toBe(HYDRATION_DOT);
		expect(getDeliveryFeeTokenId("pah")).toBe(DOT_AH);
	});

	it("spends the Hydration token sent and nothing else", () => {
		expect(
			getXcmCallSpendings({
				tokenIdIn: HYDRATION_USDT,
				totalIn: 10_000_000n,
				deliveryFee: { tokenId: HYDRATION_DOT, plancks: 0n },
			}),
		).toEqual({ [HYDRATION_USDT]: { plancks: 10_000_000n, allowDeath: true } });
	});
});

describe("Asset Hub to People", () => {
	const toPeople = { origin: "pah", destination: "ppeople" } as const;

	it.each([
		["DOT", dotToPeople, { from: "pah", to: "ppeople" }],
		["KSM", ksmToPeople, { from: "kah", to: "kpeople" }],
		["PAS", pasToPeople, { from: "pasah", to: "paspeople" }],
	] as const)(
		"reads the %s teleported in the message forwarded to People",
		(_, fixture, hop) => {
			if (!fixture.originDryRun.success)
				throw new Error("fixture origin failed");
			expect(parseOriginDryRun(fixture.originDryRun, hop)).toEqual({
				success: true,
				value: {
					message: fixture.originDryRun.value.forwarded_xcms[0]?.[1][0],
					sent: fixture.amount,
				},
			});
		},
	);

	it.each([
		["DOT", dotToPeople, "native::ppeople", 9994562971n, 5437029n],
		["KSM", ksmToPeople, "native::kpeople", 99963363946n, 36636054n],
		["PAS", pasToPeople, "native::paspeople", 10000000000n, 0n],
	])(
		"quotes the %s received on People and the fee People keeps",
		(_, fixture, tokenId, received, destinationFee) => {
			expect(
				parseDestinationDryRun(fixture.destinationDryRun, {
					tokenId,
					beneficiary: fixture.beneficiary,
				}),
			).toEqual({ success: true, value: received });
			expect(getTransferFee(tokenId, fixture.amount, received)).toEqual({
				tokenId,
				plancks: destinationFee,
			});
		},
	);

	it.each([
		["DOT", dotToPeople, 304850000n],
		["KSM", ksmToPeople, 1032333300n],
		["PAS", pasToPeople, 304850000n],
	])(
		"reads the %s Asset Hub charges to deliver to People",
		(_, fixture, fee) => {
			expect(parseDeliveryFee(fixture.deliveryFees)).toBe(fee);
		},
	);

	it("reports trapped assets when the amount cannot endow an empty People account", () => {
		const parsed = parseDestinationDryRun(
			dotToPeopleTrapped.destinationDryRun,
			{
				tokenId: "native::ppeople",
				beneficiary: dotToPeopleTrapped.beneficiary,
			},
		);
		expect(parsed).toEqual({
			success: false,
			failure: {
				kind: "destination-rejected",
				reason: "FailedToTransactAsset",
				assetsTrapped: true,
			},
		});
		if (parsed.success) throw new Error("expected a failure");
		expect(describeXcmQuoteFailure(parsed.failure, toPeople)).toBe(
			"Amount too low for Polkadot People: the assets would be trapped",
		);
	});

	it("labels the delivery fee in the native token of each Asset Hub", () => {
		expect(getDeliveryFeeTokenId("kah")).toBe("native::kah");
		expect(getDeliveryFeeTokenId("pasah")).toBe("native::pasah");
	});
});

describe("People to Asset Hub", () => {
	it.each([
		["DOT", dotFromPeople, { from: "ppeople", to: "pah" }],
		["KSM", ksmFromPeople, { from: "kpeople", to: "kah" }],
		["WND", wndFromPeople, { from: "wpeople", to: "wah" }],
	] as const)(
		"reads the %s teleported in the message forwarded to Asset Hub",
		(_, fixture, hop) => {
			if (!fixture.originDryRun.success)
				throw new Error("fixture origin failed");
			expect(parseOriginDryRun(fixture.originDryRun, hop)).toEqual({
				success: true,
				value: {
					message: fixture.originDryRun.value.forwarded_xcms[0]?.[1][0],
					sent: fixture.amount,
				},
			});
		},
	);

	it.each([
		["DOT", dotFromPeople, "native::pah", 9991782414n, 8217586n],
		["KSM", ksmFromPeople, "native::kah", 99944627863n, 55372137n],
		["WND", wndFromPeople, "native::wah", 998342742920n, 1657257080n],
	])(
		"quotes the %s received on Asset Hub and the fee Asset Hub keeps",
		(_, fixture, tokenId, received, destinationFee) => {
			expect(
				parseDestinationDryRun(fixture.destinationDryRun, {
					tokenId,
					beneficiary: fixture.beneficiary,
				}),
			).toEqual({ success: true, value: received });
			expect(getTransferFee(tokenId, fixture.amount, received)).toEqual({
				tokenId,
				plancks: destinationFee,
			});
		},
	);

	it.each([
		["DOT", dotFromPeople, 304850000n],
		["KSM", ksmFromPeople, 1032333300n],
		["WND", wndFromPeople, 30970000000n],
	])(
		"reads the %s People charges to deliver to Asset Hub",
		(_, fixture, fee) => {
			expect(parseDeliveryFee(fixture.deliveryFees)).toBe(fee);
		},
	);

	it("reports trapped assets when the amount cannot endow an empty Asset Hub account", () => {
		const parsed = parseDestinationDryRun(
			dotFromPeopleTrapped.destinationDryRun,
			{
				tokenId: "native::pah",
				beneficiary: dotFromPeopleTrapped.beneficiary,
			},
		);
		expect(parsed).toEqual({
			success: false,
			failure: {
				kind: "destination-rejected",
				reason: "FailedToTransactAsset",
				assetsTrapped: true,
			},
		});
		if (parsed.success) throw new Error("expected a failure");
		expect(
			describeXcmQuoteFailure(parsed.failure, {
				origin: "ppeople",
				destination: "pah",
			}),
		).toBe(
			"Amount too low for Polkadot Asset Hub: the assets would be trapped",
		);
	});

	it("reports that Paseo Asset Hub cannot weigh a teleport from Paseo People", () => {
		expect(
			parseDestinationDryRun(pasFromPeopleRejected.destinationDryRun, {
				tokenId: "native::pasah",
				beneficiary: pasFromPeopleRejected.beneficiary,
			}),
		).toEqual({
			success: false,
			failure: {
				kind: "destination-rejected",
				reason: "Overflow",
				assetsTrapped: false,
			},
		});
	});

	it("charges the delivery fee in the People native token", () => {
		expect(getDeliveryFeeTokenId("ppeople")).toBe("native::ppeople");
		expect(getDeliveryFeeTokenId("kpeople")).toBe("native::kpeople");
		expect(getDeliveryFeeTokenId("wpeople")).toBe("native::wpeople");
	});

	it("spends the amount and the delivery fee from the People balance, keeping the account alive", () => {
		expect(
			getXcmCallSpendings({
				tokenIdIn: "native::ppeople",
				totalIn: dotFromPeople.amount,
				deliveryFee: { tokenId: "native::ppeople", plancks: 304850000n },
			}),
		).toEqual({
			"native::ppeople": { plancks: 10304850000n, allowDeath: false },
		});
	});
});

describe("transfers through Asset Hub", () => {
	const peopleToHydration = {
		origin: "ppeople",
		destination: "hydration",
	} as const;

	const getForwarded = (dryRun: OriginDryRun | HubDryRun) => {
		if (!dryRun.success) throw new Error("fixture dry run failed");
		const [forwarded, ...others] = dryRun.value.forwarded_xcms;
		if (!forwarded || others.length) throw new Error("expected one message");
		return forwarded[1][0];
	};

	it.each([
		[
			"People DOT to Hydration",
			dotPeopleToHydration,
			{ from: "ppeople", to: "pah" },
			{ from: "pah", to: "hydration" },
			HYDRATION_DOT,
			9678556145n,
		],
		[
			"Hydration DOT to People",
			dotHydrationToPeople,
			{ from: "hydration", to: "pah" },
			{ from: "pah", to: "ppeople" },
			"native::ppeople",
			9678791246n,
		],
	] as const)(
		"quotes %s from the message Asset Hub forwards to the destination",
		(_, fixture, toHub, fromHub, tokenIdOut, received) => {
			const origin = parseOriginDryRun(fixture.originDryRun, toHub);
			expect(origin).toEqual({
				success: true,
				value: {
					message: getForwarded(fixture.originDryRun),
					sent: fixture.amount,
				},
			});

			const hub = parseHubDryRun(fixture.hubDryRun, fromHub);
			expect(hub).toEqual({
				success: true,
				value: getForwarded(fixture.hubDryRun),
			});

			expect(
				parseDestinationDryRun(requireDestination(fixture.destinationDryRun), {
					tokenId: tokenIdOut,
					beneficiary: fixture.beneficiary,
				}),
			).toEqual({ success: true, value: received });
			expect(getTransferFee(tokenIdOut, fixture.amount, received)).toEqual({
				tokenId: tokenIdOut,
				plancks: fixture.amount - received,
			});
		},
	);

	it("finds nothing sent by the origin to the destination directly", () => {
		expect(
			parseOriginDryRun(dotPeopleToHydration.originDryRun, {
				from: "ppeople",
				to: "hydration",
			}),
		).toEqual({ success: false, failure: { kind: "message-not-forwarded" } });
	});

	it("reads the delivery fee People charges to reach Asset Hub, and Hydration's free delivery", () => {
		expect(parseDeliveryFee(dotPeopleToHydration.deliveryFees)).toBe(
			305900000n,
		);
		expect(parseDeliveryFee(dotHydrationToPeople.deliveryFees)).toBe(0n);
	});

	it("reports assets trapped on Asset Hub when the amount cannot buy its execution", () => {
		const parsed = parseHubDryRun(dotPeopleToHydrationTrappedOnHub.hubDryRun, {
			from: "pah",
			to: "hydration",
		});
		expect(parsed).toEqual({
			success: false,
			failure: {
				kind: "hub-rejected",
				hub: "pah",
				reason: "TooExpensive",
				assetsTrapped: true,
			},
		});
		if (parsed.success) throw new Error("expected a failure");
		expect(describeXcmQuoteFailure(parsed.failure, peopleToHydration)).toBe(
			"Amount too low for Polkadot Asset Hub: the assets would be trapped",
		);
	});

	it("fails when Asset Hub forwards nothing to the destination", () => {
		const parsed = parseHubDryRun(dotPeopleToHydration.hubDryRun, {
			from: "pah",
			to: "ppeople",
		});
		expect(parsed).toEqual({
			success: false,
			failure: { kind: "hub-not-forwarded", hub: "pah" },
		});
		if (parsed.success) throw new Error("expected a failure");
		expect(describeXcmQuoteFailure(parsed.failure, peopleToHydration)).toBe(
			"Polkadot Asset Hub would not forward the transfer to Hydration",
		);
	});

	it("treats a runtime API error on Asset Hub as unavailable, never as success", () => {
		const parsed = parseHubDryRun(
			{ success: false, value: { type: "Unimplemented", value: undefined } },
			{ from: "pah", to: "hydration" },
		);
		expect(parsed).toEqual({
			success: false,
			failure: { kind: "hub-unavailable", hub: "pah" },
		});
		if (parsed.success) throw new Error("expected a failure");
		expect(describeXcmQuoteFailure(parsed.failure, peopleToHydration)).toBe(
			"Could not simulate the transfer on Polkadot Asset Hub",
		);
	});

	it("names Asset Hub when it would reject the transfer for another reason", () => {
		expect(
			describeXcmQuoteFailure(
				{
					kind: "hub-rejected",
					hub: "pah",
					reason: "Barrier",
					assetsTrapped: false,
				},
				peopleToHydration,
			),
		).toBe("Polkadot Asset Hub would reject the transfer: Barrier");
	});
});

describe("between the Polkadot and Kusama Asset Hubs", () => {
	const getQuote = (
		fixture: BridgeTransferFixture,
		tokenIdIn: string,
		tokenIdOut: string,
	) => {
		const { origin, destination, originDryRun, destinationDryRun } = fixture;
		const leg = parseOriginDryRun(originDryRun, {
			from: origin,
			to: destination,
		});
		const received =
			destinationDryRun &&
			parseDestinationDryRun(destinationDryRun, {
				tokenId: tokenIdOut,
				beneficiary: fixture.beneficiary,
			});
		if (!leg.success || !received?.success)
			throw new Error("fixture does not quote");
		return composeXcmQuote(
			{ route: { ...fixture, kind: "xcm-transfer", tokenIdIn, tokenIdOut } },
			{ sent: leg.value.sent, received: received.value },
		);
	};

	it.each([
		[
			"KSM to Polkadot",
			ksmKusamaToPolkadot,
			"native::kah",
			KSM_ON_PAH,
			99628419408n,
		],
		[
			"KSM to Kusama",
			ksmPolkadotToKusama,
			KSM_ON_PAH,
			"native::kah",
			99936618505n,
		],
		[
			"DOT to Kusama",
			dotPolkadotToKusama,
			"native::pah",
			DOT_ON_KAH,
			9997354620n,
		],
		[
			"DOT to Polkadot",
			dotKusamaToPolkadot,
			DOT_ON_KAH,
			"native::pah",
			9990523408n,
		],
	])(
		"quotes %s from what its Asset Hub exported and the other one deposited",
		(_, fixture, tokenIdIn, tokenIdOut, received) => {
			expect(getQuote(fixture, tokenIdIn, tokenIdOut)).toEqual({
				received,
				destinationFee: {
					tokenId: tokenIdOut,
					plancks: fixture.amount - received,
				},
			});
		},
	);

	it.each([
		["Kusama", ksmKusamaToPolkadot, 3496641411n],
		["Polkadot", ksmPolkadotToKusama, 376780428n],
		["Polkadot", dotPolkadotToKusama, 377047092n],
		["Kusama", dotKusamaToPolkadot, 3491308079n],
	])(
		"reads the bridge fee %s Asset Hub charges in its native token",
		(_, fixture, expected) => {
			if (!fixture.deliveryFees) throw new Error("fixture has no bridge fee");
			expect(parseDeliveryFee(fixture.deliveryFees)).toBe(expected);
			expect(getDeliveryFeeTokenId(fixture.origin)).toBe(
				`native::${fixture.origin}`,
			);
		},
	);

	it("names the token an account lacks to pay the bridge fee", () => {
		const { origin, destination, originDryRun } = ksmPolkadotToKusamaWithoutDot;
		const leg = parseOriginDryRun(originDryRun, {
			from: origin,
			to: destination,
		});
		if (leg.success) throw new Error("fixture origin succeeded");

		expect(leg.failure).toEqual({
			kind: "origin-fees-not-met",
			reason: "PolkadotXcm: FeesNotMet",
		});
		expect(
			describeXcmQuoteFailure(leg.failure, ksmPolkadotToKusamaWithoutDot),
		).toBe("You need DOT on Polkadot Asset Hub to pay the bridge fee");
		expect(
			describeXcmQuoteFailure(leg.failure, {
				origin: "kah",
				destination: "pah",
			}),
		).toBe("You need KSM on Kusama Asset Hub to pay the bridge fee");
	});

	it("keeps the dispatch error of unmet fees off the bridge", () => {
		expect(
			describeXcmQuoteFailure(
				{ kind: "origin-fees-not-met", reason: "PolkadotXcm: FeesNotMet" },
				{ origin: "pah", destination: "hydration" },
			),
		).toBe("PolkadotXcm: FeesNotMet");
	});
});
