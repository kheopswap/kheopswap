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
	getFeePayableMirrorTokenIds,
	getMirrorTokenOutId,
	getNextSwapTokens,
	getRouteAccess,
	getSwapTokenLists,
	resolveSwapRoute,
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
const HDX = "native::hydration";
const VDOT = mirrors.get(HYDRATION_VDOT) as TokenId;

const context = { assetHubId: "pah" as const, mirrors, nativeTokenId: DOT };
const ammContext = { ...context, mirrors: new Map<TokenId, TokenId>() };

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
		[DOT, HYDRATION_DOT, 5],
		[USDT, HYDRATION_USDT, 10],
		[USDC, HYDRATION_USDC, 22],
	])(
		"resolves %s to its Hydration mirror %s as an XCM transfer",
		(tokenIdIn, tokenIdOut, destinationAssetId) => {
			expect(resolveSwapRoute({ ...context, tokenIdIn, tokenIdOut })).toEqual({
				kind: "xcm-transfer",
				origin: "pah",
				destination: "hydration",
				tokenIdIn,
				tokenIdOut,
				destinationAssetId,
			});
		},
	);

	it.each([
		["a foreign asset to its Hydration mirror", VDOT, HYDRATION_VDOT],
		[
			"a token to a Hydration token that is not its mirror",
			USDT,
			HYDRATION_DOT,
		],
		["a token to Hydration's native token", DOT, HDX],
		["a Hydration token to its Asset Hub source", HYDRATION_DOT, DOT],
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

describe("getFeePayableMirrorTokenIds", () => {
	it("keeps only mirrors whose Hydration asset pays the destination fee", () => {
		const HYDRATION_WUD = "hydration-asset::hydration::1000085";
		expect(mirrors.has(HYDRATION_WUD)).toBe(true);

		const payable = getFeePayableMirrorTokenIds(mirrors, new Set([5, 10, 22]));

		expect([...payable.keys()].sort()).toEqual(
			[HYDRATION_DOT, HYDRATION_USDT, HYDRATION_USDC].sort(),
		);
		expect(payable.get(HYDRATION_USDT)).toBe(USDT);
		expect(
			resolveSwapRoute({
				assetHubId: "pah",
				mirrors: payable,
				tokenIdIn: "asset::pah::31337",
				tokenIdOut: HYDRATION_WUD,
			}),
		).toBeNull();
	});
});

describe("getMirrorTokenOutId", () => {
	it.each([
		[DOT, HYDRATION_DOT],
		[USDT, HYDRATION_USDT],
		[USDC, HYDRATION_USDC],
	])("finds the Hydration mirror of %s", (tokenIdIn, expected) => {
		expect(getMirrorTokenOutId(mirrors, tokenIdIn)).toBe(expected);
	});

	it("ignores mirrors of foreign assets, which are out of scope", () => {
		expect(getMirrorTokenOutId(mirrors, VDOT)).toBeNull();
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

describe("getNextSwapTokens on the XCM transfer route", () => {
	it.each<[string, [TokenId, TokenId], SwapTokensChange, [TokenId, TokenId]]>([
		[
			"a Hydration output sets the input to its source",
			[DOT, USDC],
			{ type: "out", tokenId: HYDRATION_USDT },
			[USDT, HYDRATION_USDT],
		],
		[
			"a Hydration DOT output sets DOT in",
			[USDT, DOT],
			{ type: "out", tokenId: HYDRATION_DOT },
			[DOT, HYDRATION_DOT],
		],
		[
			"an input change follows with its mirror",
			[DOT, HYDRATION_DOT],
			{ type: "in", tokenId: USDC },
			[USDC, HYDRATION_USDC],
		],
		[
			"DOT in follows with Hydration DOT",
			[USDT, HYDRATION_USDT],
			{ type: "in", tokenId: DOT },
			[DOT, HYDRATION_DOT],
		],
		[
			"an input without a mirror falls back to DOT out",
			[DOT, HYDRATION_DOT],
			{ type: "in", tokenId: VDOT },
			[VDOT, DOT],
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
			[USDT, HYDRATION_USDT],
			{ type: "flip" },
			[USDT, HYDRATION_USDT],
		],
	])("%s", (_, prev, change, expected) => {
		expect(next(prev, change)).toEqual(expected);
	});
});

describe("canFlipSwapTokens", () => {
	it.each<[SwapTokenIds, boolean]>([
		[{ tokenIdIn: DOT, tokenIdOut: USDT }, true],
		[{ tokenIdIn: DOT, tokenIdOut: "" }, true],
		[{ tokenIdIn: DOT, tokenIdOut: HYDRATION_DOT }, false],
	])("%o -> %s", (pair, expected) => {
		expect(canFlipSwapTokens(pair, context)).toBe(expected);
	});
});

describe("getSwapTokenLists", () => {
	const ammTokens = pick(KNOWN_TOKENS_MAP, [DOT, USDT]);
	const { tokensIn, tokensOut } = getSwapTokenLists({
		ammTokens,
		allTokens: KNOWN_TOKENS_MAP,
		mirrors,
	});

	it("offers AMM tokens and the sources of in-scope mirrors as input", () => {
		expect(Object.keys(tokensIn)).toEqual(
			expect.arrayContaining([DOT, USDT, USDC]),
		);
		expect(Object.values(tokensIn).every((t) => t.chainId === "pah")).toBe(
			true,
		);
	});

	it("offers the inputs and the in-scope Hydration mirrors as output", () => {
		expect(Object.keys(tokensOut)).toEqual(
			expect.arrayContaining([
				DOT,
				USDT,
				USDC,
				HYDRATION_DOT,
				HYDRATION_USDT,
				HYDRATION_USDC,
			]),
		);
		expect(tokensOut).not.toHaveProperty(HYDRATION_VDOT);
		expect(tokensOut).not.toHaveProperty(HDX);
	});

	it("adds nothing on relays without Hydration", () => {
		expect(
			getSwapTokenLists({
				ammTokens,
				allTokens: KNOWN_TOKENS_MAP,
				mirrors: new Map(),
			}),
		).toEqual({ tokensIn: ammTokens, tokensOut: ammTokens });
	});
});

describe("getRouteAccess", () => {
	const substrate = "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo";

	it("lets a substrate account receive on its own address", () => {
		expect(
			getRouteAccess({ platform: "polkadot", address: substrate }),
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
		expect(getRouteAccess({ platform, address })).toEqual({
			allowed: false,
			reason:
				"Ethereum accounts cannot send to Hydration yet: the same address is a different account there",
		});
	});
});
