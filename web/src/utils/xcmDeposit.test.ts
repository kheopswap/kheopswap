import { AccountId } from "polkadot-api";
import { describe, expect, it } from "vitest";
import {
	DOT_ON_KAH,
	dotKusamaToPolkadot,
	dotPolkadotToKusama,
	KSM_ON_PAH,
	ksmKusamaToPolkadot,
	ksmPolkadotToKusama,
} from "../features/swap/routes/xcm/xcmBridge.fixtures";
import {
	dotToAssetHub,
	dotToAssetHubDotFeePayer,
	usdcToAssetHub,
	usdtToAssetHub,
} from "../features/swap/routes/xcm/xcmFromHydration.fixtures";
import { dotSuccess } from "../features/swap/routes/xcm/xcmTransfer.fixtures";
import type { TxEvents } from "./getErrorMessageFromTxEvents";
import { getXcmDepositMatcher, type XcmDepositTarget } from "./xcmDeposit";

type DestinationDryRun =
	| typeof dotToAssetHub.destination
	| typeof dotSuccess.destination
	| typeof ksmKusamaToPolkadot.destinationDryRun;

const getEvents = (dryRun: DestinationDryRun): TxEvents => {
	if (!dryRun?.success) throw new Error("fixture has no destination events");
	return dryRun.value.emitted_events;
};

const sumDeposits = (events: TxEvents, target: XcmDepositTarget) =>
	events.map(getXcmDepositMatcher(target)).reduce((a, b) => a + b, 0n);

describe("getXcmDepositMatcher", () => {
	it("counts a DOT deposit to a new Asset Hub account once, ignoring Endowed and the fee receiver", () => {
		const fixture = dotToAssetHubDotFeePayer;
		expect(
			sumDeposits(getEvents(fixture.destination), {
				tokenId: "native::pah",
				beneficiary: fixture.beneficiary,
			}),
		).toBe(9991650007n);
	});

	it("counts the DOT deposited to an existing Asset Hub account", () => {
		expect(
			sumDeposits(getEvents(dotToAssetHub.destination), {
				tokenId: "native::pah",
				beneficiary: dotToAssetHub.beneficiary,
			}),
		).toBe(9991650007n);
	});

	it.each([
		["USDT", usdtToAssetHub, "asset::pah::1984", 9999003n],
		["USDC", usdcToAssetHub, "asset::pah::1337", 9999000n],
	])(
		"counts the %s deposited to the beneficiary, not to the pool that swaps the fee",
		(_, fixture, tokenId, expected) => {
			expect(
				sumDeposits(getEvents(fixture.destination), {
					tokenId,
					beneficiary: fixture.beneficiary,
				}),
			).toBe(expected);
		},
	);

	it("ignores deposits of another asset", () => {
		expect(
			sumDeposits(getEvents(usdtToAssetHub.destination), {
				tokenId: "asset::pah::1337",
				beneficiary: usdtToAssetHub.beneficiary,
			}),
		).toBe(0n);
	});

	it("matches the beneficiary whatever its address prefix", () => {
		expect(
			sumDeposits(getEvents(dotToAssetHub.destination), {
				tokenId: "native::pah",
				beneficiary: AccountId(42).dec(
					AccountId().enc(dotToAssetHub.beneficiary),
				),
			}),
		).toBe(9991650007n);
	});

	it("counts a Hydration token deposit", () => {
		expect(
			sumDeposits(getEvents(dotSuccess.destination), {
				tokenId: "hydration-asset::hydration::5",
				beneficiary: dotSuccess.beneficiary,
			}),
		).toBe(9995190152n);
	});

	it.each([
		[
			"KSM on Polkadot Asset Hub",
			ksmKusamaToPolkadot,
			KSM_ON_PAH,
			99628419408n,
		],
		["DOT on Kusama Asset Hub", dotPolkadotToKusama, DOT_ON_KAH, 9997354620n],
	])(
		"counts the bridged %s deposited to the beneficiary, not the part swapped for the fee",
		(_, fixture, tokenId, expected) => {
			expect(
				sumDeposits(getEvents(fixture.destinationDryRun), {
					tokenId,
					beneficiary: fixture.beneficiary,
				}),
			).toBe(expected);
		},
	);

	it.each([
		["KSM", ksmPolkadotToKusama, "native::kah", 99936618505n],
		["DOT", dotKusamaToPolkadot, "native::pah", 9990523408n],
	])(
		"counts the %s released to the beneficiary on its own Asset Hub",
		(_, fixture, tokenId, expected) => {
			expect(
				sumDeposits(getEvents(fixture.destinationDryRun), {
					tokenId,
					beneficiary: fixture.beneficiary,
				}),
			).toBe(expected);
		},
	);

	it("ignores deposits of another foreign asset", () => {
		expect(
			sumDeposits(getEvents(ksmKusamaToPolkadot.destinationDryRun), {
				tokenId: DOT_ON_KAH,
				beneficiary: ksmKusamaToPolkadot.beneficiary,
			}),
		).toBe(0n);
	});
});
