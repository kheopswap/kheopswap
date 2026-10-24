import { pick } from "lodash-es";
import { describe, expect, it } from "vitest";
import { getChainById, getChains } from "../../../registry/chains/chains";
import type { ChainIdAssetHub } from "../../../registry/chains/types";
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

const getRelayMirrors = (assetHubId: ChainIdAssetHub) => {
	const assetHub = getChainById(assetHubId);
	return getAssetHubMirrorTokenIds(
		KNOWN_TOKENS_MAP,
		assetHub,
		getChains().filter((chain) => chain.relay === assetHub.relay),
	);
};

const mirrors = getRelayMirrors("pah");

const DOT = "native::pah";
const USDT = "asset::pah::1984";
const USDC = "asset::pah::1337";
const PINK = "asset::pah::23";
const HYDRATION_DOT = "hydration-asset::hydration::5";
const HYDRATION_USDT = "hydration-asset::hydration::10";
const HYDRATION_USDC = "hydration-asset::hydration::22";
const HYDRATION_VDOT = "hydration-asset::hydration::15";
const HYDRATION_WUD = "hydration-asset::hydration::1000085";
const HDX = "native::hydration";
const PEOPLE_DOT = "native::ppeople";
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
	it.each([
		["DOT to USDT", DOT, USDT, [{ tokenIdIn: DOT, tokenIdOut: USDT }]],
		["USDT to DOT", USDT, DOT, [{ tokenIdIn: USDT, tokenIdOut: DOT }]],
		[
			"USDC to USDT through DOT",
			USDC,
			USDT,
			[
				{ tokenIdIn: USDC, tokenIdOut: DOT },
				{ tokenIdIn: DOT, tokenIdOut: USDT },
			],
		],
	])("resolves %s as an AMM swap", (_, tokenIdIn, tokenIdOut, path) => {
		expect(resolveSwapRoute({ ...context, tokenIdIn, tokenIdOut })).toEqual({
			kind: "amm-swap",
			chainId: "pah",
			tokenIdIn,
			tokenIdOut,
			path,
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
		["the People native token to another Asset Hub token", PEOPLE_DOT, USDT],
		["an asset to the People native token", USDT, PEOPLE_DOT],
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

	it.each([
		["pah", "ppeople"],
		["kah", "kpeople"],
		["wah", "wpeople"],
		["pasah", "paspeople"],
	] as const)(
		"resolves the %s native token to %s as an XCM transfer",
		(assetHubId, peopleId) => {
			const tokenIdIn = `native::${assetHubId}` as const;
			const tokenIdOut = `native::${peopleId}` as const;
			expect(
				resolveSwapRoute({
					...context,
					assetHubId,
					mirrors: getRelayMirrors(assetHubId),
					nativeTokenId: tokenIdIn,
					tokenIdIn,
					tokenIdOut,
				}),
			).toEqual({
				kind: "xcm-transfer",
				origin: assetHubId,
				destination: peopleId,
				tokenIdIn,
				tokenIdOut,
			});
		},
	);

	it.each([
		["ppeople", "pah"],
		["kpeople", "kah"],
		["wpeople", "wah"],
	] as const)(
		"resolves the %s native token back to %s as an XCM transfer",
		(peopleId, assetHubId) => {
			const tokenIdIn = `native::${peopleId}` as const;
			const tokenIdOut = `native::${assetHubId}` as const;
			expect(
				resolveSwapRoute({
					...context,
					assetHubId,
					mirrors: getRelayMirrors(assetHubId),
					nativeTokenId: tokenIdOut,
					tokenIdIn,
					tokenIdOut,
				}),
			).toEqual({
				kind: "xcm-transfer",
				origin: peopleId,
				destination: assetHubId,
				tokenIdIn,
				tokenIdOut,
			});
		},
	);

	it("rejects PAS from Paseo People, which Paseo Asset Hub cannot receive by teleport", () => {
		expect(
			resolveSwapRoute({
				...context,
				assetHubId: "pasah",
				mirrors: getRelayMirrors("pasah"),
				nativeTokenId: "native::pasah",
				tokenIdIn: "native::paspeople",
				tokenIdOut: "native::pasah",
			}),
		).toBeNull();
	});

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

describe("getNextSwapTokens keeps the side the user changed", () => {
	it.each<[string, [TokenId, TokenId], SwapTokensChange, [TokenId, TokenId]]>([
		[
			"an asset in keeps an asset out, swapping through DOT",
			[DOT, USDC],
			{ type: "in", tokenId: PINK },
			[PINK, USDC],
		],
		[
			"an asset in keeps a Hydration output it swaps to through DOT",
			[USDC, HYDRATION_DOT],
			{ type: "out", tokenId: HYDRATION_USDT },
			[USDC, HYDRATION_USDT],
		],
		[
			"the People output replaces an asset in that cannot reach People with DOT",
			[USDC, USDT],
			{ type: "out", tokenId: PEOPLE_DOT },
			[DOT, PEOPLE_DOT],
		],
		[
			"an Asset Hub output replaces Hydration DOT in with its Hydration mirror",
			[HYDRATION_DOT, DOT],
			{ type: "out", tokenId: USDC },
			[HYDRATION_USDC, USDC],
		],
		[
			"the output picked as input flips the pair",
			[USDT, USDC],
			{ type: "in", tokenId: USDC },
			[USDC, USDT],
		],
		[
			"the input picked as output flips the pair",
			[USDT, USDC],
			{ type: "out", tokenId: USDT },
			[USDC, USDT],
		],
		[
			"an input with no output fills DOT out",
			[DOT, ""],
			{ type: "in", tokenId: USDT },
			[USDT, DOT],
		],
		[
			"an output nothing routes to empties the input",
			[USDT, DOT],
			{ type: "out", tokenId: HYDRATION_VDOT },
			["", HYDRATION_VDOT],
		],
	])("%s", (_, prev, change, expected) => {
		expect(next(prev, change)).toEqual(expected);
	});

	it("routes USDC on Asset Hub to USDT on Hydration in two hops through DOT", () => {
		const [tokenIdIn, tokenIdOut] = next([USDC, DOT], {
			type: "out",
			tokenId: HYDRATION_USDT,
		});
		expect(resolveSwapRoute({ ...context, tokenIdIn, tokenIdOut })).toEqual(
			expect.objectContaining({
				kind: "xcm-swap",
				path: [
					{ tokenIdIn: USDC, tokenIdOut: DOT },
					{ tokenIdIn: DOT, tokenIdOut: USDT },
				],
			}),
		);
	});
});

describe("getNextSwapTokens on Asset Hub", () => {
	it.each<[string, [TokenId, TokenId], SwapTokensChange, [TokenId, TokenId]]>([
		[
			"an asset in keeps the asset out",
			[DOT, USDC],
			{ type: "in", tokenId: USDT },
			[USDT, USDC],
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
			"an asset out keeps the asset in",
			[USDT, DOT],
			{ type: "out", tokenId: USDC },
			[USDT, USDC],
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
			"DOT out flips DOT in to bring it back from Hydration",
			[DOT, HYDRATION_DOT],
			{ type: "out", tokenId: DOT },
			[HYDRATION_DOT, DOT],
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

describe("getNextSwapTokens to People", () => {
	it.each<[string, [TokenId, TokenId], SwapTokensChange, [TokenId, TokenId]]>([
		[
			"the People output keeps DOT in",
			[DOT, USDT],
			{ type: "out", tokenId: PEOPLE_DOT },
			[DOT, PEOPLE_DOT],
		],
		[
			"the People output moves DOT in",
			[USDT, DOT],
			{ type: "out", tokenId: PEOPLE_DOT },
			[DOT, PEOPLE_DOT],
		],
		[
			"an asset in falls back to an AMM swap to DOT",
			[DOT, PEOPLE_DOT],
			{ type: "in", tokenId: USDT },
			[USDT, DOT],
		],
		[
			"flip turns the teleport around",
			[DOT, PEOPLE_DOT],
			{ type: "flip" },
			[PEOPLE_DOT, DOT],
		],
	])("%s", (_, prev, change, expected) => {
		expect(next(prev, change)).toEqual(expected);
	});
});

describe("getNextSwapTokens from People", () => {
	it.each<[string, [TokenId, TokenId], SwapTokensChange, [TokenId, TokenId]]>([
		[
			"the People input moves DOT out",
			[DOT, USDT],
			{ type: "in", tokenId: PEOPLE_DOT },
			[PEOPLE_DOT, DOT],
		],
		[
			"the People output picked as input turns the teleport around",
			[DOT, PEOPLE_DOT],
			{ type: "in", tokenId: PEOPLE_DOT },
			[PEOPLE_DOT, DOT],
		],
		[
			"flip turns the teleport around",
			[PEOPLE_DOT, DOT],
			{ type: "flip" },
			[DOT, PEOPLE_DOT],
		],
		[
			"an Asset Hub output People cannot send falls back to an AMM swap",
			[PEOPLE_DOT, DOT],
			{ type: "out", tokenId: USDT },
			[DOT, USDT],
		],
		[
			"a Hydration input keeps DOT out but sends it from Hydration",
			[PEOPLE_DOT, DOT],
			{ type: "in", tokenId: HYDRATION_DOT },
			[HYDRATION_DOT, DOT],
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
			"an output without a Hydration mirror swaps from the input's source",
			[HYDRATION_USDT, USDT],
			{ type: "out", tokenId: VDOT },
			[USDT, VDOT],
		],
		[
			"a Hydration output swaps to it from the input's source",
			[HYDRATION_USDT, USDT],
			{ type: "out", tokenId: HYDRATION_USDC },
			[USDT, HYDRATION_USDC],
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
		[{ tokenIdIn: DOT, tokenIdOut: PEOPLE_DOT }, true],
		[{ tokenIdIn: PEOPLE_DOT, tokenIdOut: DOT }, true],
	])("%o -> %s", (pair, expected) => {
		expect(canFlipSwapTokens(pair, context)).toBe(expected);
	});

	it("keeps PAS to Paseo People one way", () => {
		expect(
			canFlipSwapTokens(
				{ tokenIdIn: "native::pasah", tokenIdOut: "native::paspeople" },
				{
					...context,
					assetHubId: "pasah",
					mirrors: getRelayMirrors("pasah"),
					nativeTokenId: "native::pasah",
				},
			),
		).toBe(false);
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

	it("offers the People native token both ways", () => {
		expect(tokensOut).toHaveProperty(PEOPLE_DOT);
		expect(tokensIn).toHaveProperty(PEOPLE_DOT);
	});

	it("offers PAS on Paseo People as output only", () => {
		const pas = "native::pasah";
		const lists = getSwapTokenLists({
			ammTokens: pick(KNOWN_TOKENS_MAP, [pas]),
			allTokens: KNOWN_TOKENS_MAP,
			context: {
				...context,
				assetHubId: "pasah",
				mirrors: getRelayMirrors("pasah"),
				nativeTokenId: pas,
			},
		});
		expect(Object.keys(lists.tokensIn)).toEqual([pas]);
		expect(Object.keys(lists.tokensOut)).toEqual([pas, "native::paspeople"]);
	});

	it("offers the People native token on relays without Hydration", () => {
		const ksm = "native::kah";
		const kusamaAmmTokens = pick(KNOWN_TOKENS_MAP, [ksm]);
		const lists = getSwapTokenLists({
			ammTokens: kusamaAmmTokens,
			allTokens: KNOWN_TOKENS_MAP,
			context: {
				...context,
				assetHubId: "kah",
				mirrors: getRelayMirrors("kah"),
				nativeTokenId: ksm,
			},
		});
		expect(Object.keys(lists.tokensIn)).toEqual([ksm, "native::kpeople"]);
		expect(Object.keys(lists.tokensOut)).toEqual([ksm, "native::kpeople"]);
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

	const toHydration = { origin: "pah", destination: "hydration" } as const;
	const toPeople = { origin: "pah", destination: "ppeople" } as const;
	const fromHydration = { origin: "hydration", destination: "pah" } as const;
	const fromPeople = { origin: "kpeople", destination: "kah" } as const;

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
		expect(getRouteAccess({ platform, address }, toPeople)).toEqual({
			allowed: false,
			reason:
				"Ethereum accounts cannot send to Polkadot People yet: the same address is a different account there",
		});
		expect(getRouteAccess({ platform, address }, fromHydration)).toEqual({
			allowed: false,
			reason:
				"Ethereum accounts cannot send from Hydration yet: the same address is a different account there",
		});
		expect(getRouteAccess({ platform, address }, fromPeople)).toEqual({
			allowed: false,
			reason:
				"Ethereum accounts cannot send from Kusama People yet: the same address is a different account there",
		});
	});
});
