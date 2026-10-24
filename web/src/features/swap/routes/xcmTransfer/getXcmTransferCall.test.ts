import { AccountId } from "polkadot-api";
import { describe, expect, it } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../../../registry/tokens/tokens";
import type { TokenId } from "../../../../registry/tokens/types";
import type { XcmTransferRoute } from "../swapRoute";
import {
	dotToAssetHub,
	usdcToAssetHub,
	usdtToAssetHub,
} from "../xcm/xcmFromHydration.fixtures";
import { buildXcmTransferArgs } from "./getXcmTransferCall";

const getToken = (tokenId: TokenId) => {
	const token = KNOWN_TOKENS_MAP[tokenId];
	if (!token) throw new Error(`unknown token ${tokenId}`);
	return token;
};

const BENEFICIARY = "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo";
const BENEFICIARY_PUBLIC_KEY =
	"0x048c3dfaa8932ac253cab28b53f4360e0d024ea2c8cad7990f4958fe9f7f6342";

const getRoute = (
	tokenIdIn: string,
	destinationAssetId: number,
): XcmTransferRoute => ({
	kind: "xcm-transfer",
	origin: "pah",
	destination: "hydration",
	tokenIdIn,
	tokenIdOut: `hydration-asset::hydration::${destinationAssetId}`,
});

const getExpectedArgs = (id: unknown, plancks: bigint) => ({
	dest: {
		type: "V5",
		value: {
			parents: 1,
			interior: { type: "X1", value: { type: "Parachain", value: 2034 } },
		},
	},
	assets: {
		type: "V5",
		value: [{ id, fun: { type: "Fungible", value: plancks } }],
	},
	assets_transfer_type: { type: "LocalReserve", value: undefined },
	remote_fees_id: { type: "V5", value: id },
	fees_transfer_type: { type: "LocalReserve", value: undefined },
	custom_xcm_on_dest: {
		type: "V5",
		value: [
			{
				type: "DepositAsset",
				value: {
					assets: {
						type: "Wild",
						value: { type: "AllCounted", value: 1 },
					},
					beneficiary: {
						parents: 0,
						interior: {
							type: "X1",
							value: {
								type: "AccountId32",
								value: { network: undefined, id: BENEFICIARY_PUBLIC_KEY },
							},
						},
					},
				},
			},
		],
	},
	weight_limit: { type: "Unlimited", value: undefined },
});

describe("buildXcmTransferArgs", () => {
	it("sends DOT from its relay location, paying Hydration fees in DOT", () => {
		expect(
			buildXcmTransferArgs({
				route: getRoute("native::pah", 5),
				tokenIn: getToken("native::pah"),
				plancks: 10_000_000_000n,
				beneficiary: BENEFICIARY,
			}),
		).toEqual(
			getExpectedArgs(
				{ parents: 1, interior: { type: "Here", value: undefined } },
				10_000_000_000n,
			),
		);
	});

	it("sends USDT from the Assets pallet, paying Hydration fees in USDT", () => {
		expect(
			buildXcmTransferArgs({
				route: getRoute("asset::pah::1984", 10),
				tokenIn: getToken("asset::pah::1984"),
				plancks: 10_000_000n,
				beneficiary: BENEFICIARY,
			}),
		).toEqual(
			getExpectedArgs(
				{
					parents: 0,
					interior: {
						type: "X2",
						value: [
							{ type: "PalletInstance", value: 50 },
							{ type: "GeneralIndex", value: 1984n },
						],
					},
				},
				10_000_000n,
			),
		);
	});

	it("deposits to the same public key whatever the address prefix", () => {
		const generic = AccountId(42).dec(AccountId().enc(BENEFICIARY));
		const args = buildXcmTransferArgs({
			route: getRoute("native::pah", 5),
			tokenIn: getToken("native::pah"),
			plancks: 1n,
			beneficiary: generic,
		});
		expect(args.custom_xcm_on_dest).toEqual(
			getExpectedArgs(null, 1n).custom_xcm_on_dest,
		);
	});
});

describe("buildXcmTransferArgs from Hydration", () => {
	it.each([
		["DOT", "hydration-asset::hydration::5", "native::pah", dotToAssetHub],
		[
			"USDT",
			"hydration-asset::hydration::10",
			"asset::pah::1984",
			usdtToAssetHub,
		],
		[
			"USDC",
			"hydration-asset::hydration::22",
			"asset::pah::1337",
			usdcToAssetHub,
		],
	])(
		"sends %s back with Asset Hub as the reserve of the asset and its fee",
		(_, tokenIdIn, tokenIdOut, fixture) => {
			expect(
				buildXcmTransferArgs({
					route: {
						kind: "xcm-transfer",
						origin: "hydration",
						destination: "pah",
						tokenIdIn,
						tokenIdOut,
					},
					tokenIn: getToken(tokenIdIn),
					plancks: fixture.amount,
					beneficiary: fixture.beneficiary,
				}),
			).toEqual(fixture.callArgs);
		},
	);

	it("refuses a Hydration token without a location rather than guessing one", () => {
		const hydrationDot = getToken("hydration-asset::hydration::5");
		if (hydrationDot.type !== "hydration-asset")
			throw new Error("Hydration DOT is not a Hydration asset");
		const tokenIn = { ...hydrationDot, location: undefined };
		expect(() =>
			buildXcmTransferArgs({
				route: {
					kind: "xcm-transfer",
					origin: "hydration",
					destination: "pah",
					tokenIdIn: "hydration-asset::hydration::5",
					tokenIdOut: "native::pah",
				},
				tokenIn,
				plancks: 1n,
				beneficiary: BENEFICIARY,
			}),
		).toThrow();
	});
});
