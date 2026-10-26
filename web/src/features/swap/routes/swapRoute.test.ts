import { pick } from "lodash-es";
import { describe, expect, it } from "vitest";
import {
	getChainById,
	getChains,
	isChainIdHydration,
} from "../../../registry/chains/chains";
import type { Chain, ChainIdHydration } from "../../../registry/chains/types";
import { KNOWN_TOKENS_MAP } from "../../../registry/tokens/tokens";
import type { TokenId } from "../../../registry/tokens/types";
import { getAssetHubMirrorTokenIds } from "../../../utils/getAssetHubMirrorTokenId";
import {
	canFlipSwapTokens,
	getNextSwapTokens,
	getRouteAccess,
	getSwapTokenLists,
	resolveSwapRoute,
	type SwapRouteContext,
	type SwapTokenIds,
	type SwapTokensChange,
} from "./swapRoute";

const hydration = getChains().find((chain): chain is Chain<ChainIdHydration> =>
	isChainIdHydration(chain.id),
);
if (!hydration) throw new Error("Hydration chain not found");

const mirrors = getAssetHubMirrorTokenIds(
	KNOWN_TOKENS_MAP,
	getChainById("pah"),
	hydration,
);

const DOT = "native::pah";
const USDT = "asset::pah::1984";
const USDC = "asset::pah::1337";
const HYDRATION_DOT = "hydration-asset::hydration::5";
const HYDRATION_USDT = "hydration-asset::hydration::10";
const HYDRATION_USDC = "hydration-asset::hydration::22";
const HYDRATION_VDOT = "hydration-asset::hydration::15";
const HYDRATION_WUD = "hydration-asset::hydration::1000085";
const HDX = "native::hydration";
const VDOT = mirrors.get(HYDRATION_VDOT) as TokenId;
const WUD = mirrors.get(HYDRATION_WUD) as TokenId;

const context: SwapRouteContext = {
	assetHubId: "pah",
	mirrors,
	hydrationFeeAssetIds: new Set([5, 10, 15, 22]),
	nativeTokenId: DOT,
};
const ammContext: SwapRouteContext = {
	...context,
	mirrors: new Map(),
	hydrationFeeAssetIds: new Set(),
};

describe("resolveSwapRoute", () => {
	it("resolves a pair of Asset Hub tokens to an AMM swap", () => {
		expect(
			resolveSwapRoute({ ...context, tokenIdIn: DOT, tokenIdOut: USDT }),
		).toEqual({
			kind: "amm-swap",
			chainId: "pah",
			tokenIdIn: DOT,
			tokenIdOut: USDT,
		});
	});

	it.each([
		[DOT, HYDRATION_DOT],
		[USDT, HYDRATION_USDT],
		[USDC, HYDRATION_USDC],
	])(
		"resolves %s to its Hydration mirror %s as an XCM transfer",
		(tokenIdIn, tokenIdOut) => {
			expect(resolveSwapRoute({ ...context, tokenIdIn, tokenIdOut })).toEqual({
				kind: "xcm-transfer",
				origin: "pah",
				destination: "hydration",
				tokenIdIn,
				tokenIdOut,
			});
		},
	);

	it.each([
		[
			"USDC to Hydration USDT through DOT",
			USDC,
			HYDRATION_USDT,
			[
				{ tokenIdIn: USDC, tokenIdOut: DOT },
				{ tokenIdIn: DOT, tokenIdOut: USDT },
			],
		],
		[
			"DOT to Hydration USDT",
			DOT,
			HYDRATION_USDT,
			[{ tokenIdIn: DOT, tokenIdOut: USDT }],
		],
		[
			"USDT to Hydration DOT",
			USDT,
			HYDRATION_DOT,
			[{ tokenIdIn: USDT, tokenIdOut: DOT }],
		],
		[
			"the foreign asset vDOT to Hydration USDC through DOT",
			VDOT,
			HYDRATION_USDC,
			[
				{ tokenIdIn: VDOT, tokenIdOut: DOT },
				{ tokenIdIn: DOT, tokenIdOut: USDC },
			],
		],
	])(
		"resolves %s as a swap sent to Hydration",
		(_, tokenIdIn, tokenIdOut, path) => {
			expect(resolveSwapRoute({ ...context, tokenIdIn, tokenIdOut })).toEqual({
				kind: "xcm-swap",
				origin: "pah",
				destination: "hydration",
				tokenIdIn,
				tokenIdOut,
				path,
			});
		},
	);

	it.each([
		["a foreign asset to its Hydration mirror", VDOT, HYDRATION_VDOT],
		[
			"DOT to a Hydration token whose mirror is a foreign asset",
			DOT,
			HYDRATION_VDOT,
		],
		["a pool asset to a Hydration token", "pool-asset::pah::1", HYDRATION_USDT],
		["a token to Hydration's native token", DOT, HDX],
		[
			"a token to a Hydration token Hydration does not take fees in",
			WUD,
			HYDRATION_WUD,
		],
		["a Hydration token to another Asset Hub token", HYDRATION_USDT, DOT],
		["a Hydration token whose mirror is a foreign asset", HYDRATION_VDOT, VDOT],
		["Hydration's native token", HDX, DOT],
		[
			"a Hydration token to another Hydration token",
			HYDRATION_DOT,
			HYDRATION_USDT,
		],
		["a token to itself", DOT, DOT],
		["a missing output token", DOT, ""],
		["a missing input token", "", USDT],
	])("rejects %s", (_, tokenIdIn, tokenIdOut) => {
		expect(resolveSwapRoute({ ...context, tokenIdIn, tokenIdOut })).toBeNull();
	});

	it.each([
		[HYDRATION_DOT, DOT],
		[HYDRATION_USDT, USDT],
		[HYDRATION_USDC, USDC],
		[HYDRATION_WUD, WUD],
	])(
		"resolves %s back to its Asset Hub source %s as an XCM transfer",
		(tokenIdIn, tokenIdOut) => {
			expect(resolveSwapRoute({ ...context, tokenIdIn, tokenIdOut })).toEqual({
				kind: "xcm-transfer",
				origin: "hydration",
				destination: "pah",
				tokenIdIn,
				tokenIdOut,
			});
		},
	);

	it("rejects every Hydration pair when the relay has no mirrors", () => {
		expect(
			resolveSwapRoute({
				...ammContext,
				tokenIdIn: DOT,
				tokenIdOut: HYDRATION_DOT,
			}),
		).toBeNull();
	});
});

const next = (
	prev: [TokenId, TokenId],
	change: SwapTokensChange,
	ctx = context,
): [TokenId, TokenId] => {
	const result = getNextSwapTokens(
		{ tokenIdIn: prev[0], tokenIdOut: prev[1] },
		change,
		ctx,
	);
	return [result.tokenIdIn, result.tokenIdOut];
};

describe("getNextSwapTokens keeps today's AMM rules", () => {
	it.each<[string, [TokenId, TokenId], SwapTokensChange, [TokenId, TokenId]]>([
		[
			"input token forces DOT out",
			[DOT, USDC],
			{ type: "in", tokenId: USDT },
			[USDT, DOT],
		],
		[
			"DOT in while DOT is out swaps sides",
			[USDT, DOT],
			{ type: "in", tokenId: DOT },
			[DOT, USDT],
		],
		[
			"DOT in keeps the output otherwise",
			[USDT, USDC],
			{ type: "in", tokenId: DOT },
			[DOT, USDC],
		],
		[
			"output token forces DOT in",
			[USDT, DOT],
			{ type: "out", tokenId: USDC },
			[DOT, USDC],
		],
		[
			"DOT out while DOT is in swaps sides",
			[DOT, USDT],
			{ type: "out", tokenId: DOT },
			[USDT, DOT],
		],
		[
			"DOT out keeps the input otherwise",
			[USDT, USDC],
			{ type: "out", tokenId: DOT },
			[USDT, DOT],
		],
		[
			"DOT out with no output swaps sides",
			[DOT, ""],
			{ type: "out", tokenId: DOT },
			["", DOT],
		],
		["flip swaps sides", [DOT, USDT], { type: "flip" }, [USDT, DOT]],
		["flip swaps sides with no output", [DOT, ""], { type: "flip" }, ["", DOT]],
	])("%s", (_, prev, change, expected) => {
		expect(next(prev, change)).toEqual(expected);
		expect(next(prev, change, ammContext)).toEqual(expected);
	});
});

describe("getNextSwapTokens on the XCM routes", () => {
	it.each<[string, [TokenId, TokenId], SwapTokensChange, [TokenId, TokenId]]>([
		[
			"a Hydration output keeps DOT in for a one-hop swap",
			[DOT, USDC],
			{ type: "out", tokenId: HYDRATION_USDT },
			[DOT, HYDRATION_USDT],
		],
		[
			"a Hydration output keeps an asset in for a two-hop swap",
			[USDC, DOT],
			{ type: "out", tokenId: HYDRATION_USDT },
			[USDC, HYDRATION_USDT],
		],
		[
			"a Hydration output keeps its source in for a transfer",
			[USDT, DOT],
			{ type: "out", tokenId: HYDRATION_USDT },
			[USDT, HYDRATION_USDT],
		],
		[
			"a Hydration output with no input sets its source in",
			["", DOT],
			{ type: "out", tokenId: HYDRATION_USDT },
			[USDT, HYDRATION_USDT],
		],
		[
			"the source of the Hydration output in makes a transfer",
			[USDC, HYDRATION_USDT],
			{ type: "in", tokenId: USDT },
			[USDT, HYDRATION_USDT],
		],
		[
			"an asset in keeps Hydration DOT out",
			[DOT, HYDRATION_DOT],
			{ type: "in", tokenId: USDC },
			[USDC, HYDRATION_DOT],
		],
		[
			"DOT in keeps the Hydration output",
			[USDT, HYDRATION_USDT],
			{ type: "in", tokenId: DOT },
			[DOT, HYDRATION_USDT],
		],
		[
			"a foreign asset in keeps Hydration DOT out for a one-hop swap",
			[DOT, HYDRATION_DOT],
			{ type: "in", tokenId: VDOT },
			[VDOT, HYDRATION_DOT],
		],
		[
			"a foreign asset in keeps Hydration USDT out for a two-hop swap",
			[DOT, HYDRATION_USDT],
			{ type: "in", tokenId: VDOT },
			[VDOT, HYDRATION_USDT],
		],
		[
			"DOT out keeps DOT in rather than moving Hydration DOT in",
			[DOT, HYDRATION_DOT],
			{ type: "out", tokenId: DOT },
			[DOT, DOT],
		],
		[
			"an out-of-scope Hydration output keeps today's rule",
			[USDT, DOT],
			{ type: "out", tokenId: HYDRATION_VDOT },
			[DOT, HYDRATION_VDOT],
		],
		[
			"flip does nothing",
			[USDC, HYDRATION_USDT],
			{ type: "flip" },
			[USDC, HYDRATION_USDT],
		],
	])("%s", (_, prev, change, expected) => {
		expect(next(prev, change)).toEqual(expected);
	});
});

describe("getNextSwapTokens from Hydration", () => {
	it.each<[string, [TokenId, TokenId], SwapTokensChange, [TokenId, TokenId]]>([
		[
			"a Hydration input sends it back to its Asset Hub source",
			[DOT, USDC],
			{ type: "in", tokenId: HYDRATION_USDT },
			[HYDRATION_USDT, USDT],
		],
		[
			"a Hydration input keeps its own Asset Hub source out",
			[USDT, DOT],
			{ type: "in", tokenId: HYDRATION_DOT },
			[HYDRATION_DOT, DOT],
		],
		[
			"the Hydration output picked as input turns the transfer around",
			[DOT, HYDRATION_DOT],
			{ type: "in", tokenId: HYDRATION_DOT },
			[HYDRATION_DOT, DOT],
		],
		[
			"a Hydration input replaces a swap sent to Hydration",
			[DOT, HYDRATION_USDT],
			{ type: "in", tokenId: HYDRATION_USDT },
			[HYDRATION_USDT, USDT],
		],
		[
			"a Hydration input Hydration does not take fees in still goes back",
			[HYDRATION_USDT, USDT],
			{ type: "in", tokenId: HYDRATION_WUD },
			[HYDRATION_WUD, WUD],
		],
		[
			"an Asset Hub output moves the input to its Hydration mirror",
			[HYDRATION_USDT, USDT],
			{ type: "out", tokenId: USDC },
			[HYDRATION_USDC, USDC],
		],
		[
			"DOT out moves the input to Hydration DOT",
			[HYDRATION_USDT, USDT],
			{ type: "out", tokenId: DOT },
			[HYDRATION_DOT, DOT],
		],
		[
			"an output without a Hydration mirror falls back to an AMM swap",
			[HYDRATION_USDT, USDT],
			{ type: "out", tokenId: VDOT },
			[DOT, VDOT],
		],
		[
			"a Hydration output sends its source to Hydration",
			[HYDRATION_USDT, USDT],
			{ type: "out", tokenId: HYDRATION_USDC },
			[USDC, HYDRATION_USDC],
		],
		[
			"an Asset Hub input falls back to the AMM rules",
			[HYDRATION_USDT, USDT],
			{ type: "in", tokenId: DOT },
			[DOT, USDT],
		],
		[
			"flip sends DOT back to Hydration",
			[HYDRATION_DOT, DOT],
			{ type: "flip" },
			[DOT, HYDRATION_DOT],
		],
		[
			"flip brings DOT back from Hydration",
			[DOT, HYDRATION_DOT],
			{ type: "flip" },
			[HYDRATION_DOT, DOT],
		],
		[
			"flip sends USDT back to Hydration",
			[HYDRATION_USDT, USDT],
			{ type: "flip" },
			[USDT, HYDRATION_USDT],
		],
		[
			"flip does nothing when Hydration would not take the fee",
			[HYDRATION_WUD, WUD],
			{ type: "flip" },
			[HYDRATION_WUD, WUD],
		],
	])("%s", (_, prev, change, expected) => {
		expect(next(prev, change)).toEqual(expected);
	});
});

describe("canFlipSwapTokens", () => {
	it.each<[SwapTokenIds, boolean]>([
		[{ tokenIdIn: DOT, tokenIdOut: USDT }, true],
		[{ tokenIdIn: DOT, tokenIdOut: "" }, true],
		[{ tokenIdIn: DOT, tokenIdOut: HYDRATION_DOT }, true],
		[{ tokenIdIn: HYDRATION_DOT, tokenIdOut: DOT }, true],
		[{ tokenIdIn: HYDRATION_USDT, tokenIdOut: USDT }, true],
		[{ tokenIdIn: USDC, tokenIdOut: HYDRATION_USDT }, false],
		[{ tokenIdIn: HYDRATION_WUD, tokenIdOut: WUD }, false],
		[{ tokenIdIn: DOT, tokenIdOut: HYDRATION_VDOT }, false],
	])("%o -> %s", (pair, expected) => {
		expect(canFlipSwapTokens(pair, context)).toBe(expected);
	});
});

describe("getSwapTokenLists", () => {
	const ammTokens = pick(KNOWN_TOKENS_MAP, [DOT, USDT, WUD]);
	const { tokensIn, tokensOut } = getSwapTokenLists({
		ammTokens,
		allTokens: KNOWN_TOKENS_MAP,
		context,
	});

	it("offers AMM tokens and the sources of in-scope mirrors as input", () => {
		expect(Object.keys(tokensIn)).toEqual(
			expect.arrayContaining([DOT, USDT, USDC, WUD]),
		);
	});

	it("offers as input the Hydration tokens Asset Hub can swap to DOT for its fee", () => {
		expect(Object.keys(tokensIn)).toEqual(
			expect.arrayContaining([HYDRATION_DOT, HYDRATION_USDT, HYDRATION_WUD]),
		);
		expect(tokensIn).not.toHaveProperty(HYDRATION_USDC);
		expect(tokensIn).not.toHaveProperty(HYDRATION_VDOT);
		expect(tokensIn).not.toHaveProperty(HDX);
		expect(
			Object.values(tokensIn).every(
				(t) =>
					t.chainId === "pah" ||
					resolveSwapRoute({
						...context,
						tokenIdIn: t.id,
						tokenIdOut: mirrors.get(t.id),
					}),
			),
		).toBe(true);
	});

	it("offers the inputs and the Hydration mirrors that take fees as output", () => {
		expect(Object.keys(tokensOut)).toEqual(
			expect.arrayContaining([
				DOT,
				USDT,
				USDC,
				WUD,
				HYDRATION_DOT,
				HYDRATION_USDT,
				HYDRATION_USDC,
			]),
		);
		expect(tokensOut).not.toHaveProperty(HYDRATION_WUD);
		expect(tokensOut).not.toHaveProperty(HYDRATION_VDOT);
		expect(tokensOut).not.toHaveProperty(HDX);
	});

	it("adds nothing on relays without Hydration", () => {
		expect(
			getSwapTokenLists({
				ammTokens,
				allTokens: KNOWN_TOKENS_MAP,
				context: ammContext,
			}),
		).toEqual({ tokensIn: ammTokens, tokensOut: ammTokens });
	});
});

describe("getRouteAccess", () => {
	const substrate = "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo";

	const toHydration = { origin: "pah" } as const;
	const fromHydration = { origin: "hydration" } as const;

	it("lets a substrate account receive on its own address", () => {
		expect(
			getRouteAccess({ platform: "polkadot", address: substrate }, toHydration),
		).toEqual({
			allowed: true,
			beneficiary: substrate,
		});
	});

	it.each([
		[
			"an ethereum wallet account",
			"ethereum",
			"0x1234567890123456789012345678901234567890",
		],
		[
			"an ethereum address from a polkadot wallet",
			"polkadot",
			"0x1234567890123456789012345678901234567890",
		],
	] as const)("refuses %s", (_, platform, address) => {
		expect(getRouteAccess({ platform, address }, toHydration)).toEqual({
			allowed: false,
			reason:
				"Ethereum accounts cannot send to Hydration yet: the same address is a different account there",
		});
		expect(getRouteAccess({ platform, address }, fromHydration)).toEqual({
			allowed: false,
			reason:
				"Ethereum accounts cannot send from Hydration yet: the same address is a different account there",
		});
	});
});
