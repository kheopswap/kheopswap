import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type AmmPathQuote,
	getAmmPath,
	getLastHop,
	mapHopPath,
} from "../ammPath";
import type { XcmDestinationSwapRoute } from "../swapRoute";
import { useCanReceiveSwapLeftovers } from "./useCanReceiveSwapLeftovers";

const DOT = "native::pah";
const USDT = "asset::pah::1984";
const PINK = "asset::pah::23";
const BENEFICIARY = "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo";

const account = vi.hoisted(() => ({
	sufficientTokenIds: new Set<string>(),
	nativeBalance: 0n,
	unreceivableTokenIds: new Set<string>(),
	loadingTokenIds: new Set<string>(),
	asked: [] as { tokenId: string; plancks: bigint }[],
}));

vi.mock("../../../../hooks/useToken", () => ({
	useToken: ({ tokenId }: { tokenId: string | undefined }) => ({
		data: tokenId
			? { id: tokenId, isSufficient: account.sufficientTokenIds.has(tokenId) }
			: null,
		isLoading: false,
	}),
}));

vi.mock("../../../../hooks/useBalance", () => ({
	useBalance: () => ({ data: account.nativeBalance, isLoading: false }),
}));

vi.mock("../../../../hooks/useCanAccountReceive", () => ({
	useCanAccountReceive: ({
		tokenId,
		plancks,
	}: {
		tokenId: string | undefined;
		plancks: bigint | undefined;
	}) => {
		if (!tokenId || plancks === undefined) return { data: undefined };
		account.asked.push({ tokenId, plancks });
		return {
			isLoading: account.loadingTokenIds.has(tokenId),
			data: { canReceive: !account.unreceivableTokenIds.has(tokenId) },
		};
	},
}));

const getRoute = (tokenIdIn: string, tokenIdOut: string) => {
	const route: XcmDestinationSwapRoute = {
		kind: "xcm-destination-swap",
		origin: "hydration",
		destination: "pah",
		tokenIdIn: `hydration-asset::hydration::${tokenIdIn}`,
		tokenIdOut,
		path: getAmmPath(tokenIdIn, tokenIdOut, DOT),
	};
	const hops = mapHopPath(route.path, (hop, index) => ({
		...hop,
		amountIn: 1000n * 10n ** BigInt(index),
		amountOut: 1000n * 10n ** BigInt(index + 1),
		minOut: 990n * 10n ** BigInt(index + 1),
		protocolCommission: 0n,
	}));
	const { amountOut, minOut } = getLastHop(hops);
	const pathQuote: AmmPathQuote = { hops, amountOut, minOut };
	return { route, pathQuote };
};

const check = (tokenIdIn: string, tokenIdOut: string) => {
	const { route, pathQuote } = getRoute(tokenIdIn, tokenIdOut);
	return renderHook(() =>
		useCanReceiveSwapLeftovers({ route, beneficiary: BENEFICIARY, pathQuote }),
	).result.current;
};

beforeEach(() => {
	account.sufficientTokenIds = new Set([USDT]);
	account.nativeBalance = 0n;
	account.unreceivableTokenIds = new Set();
	account.loadingTokenIds = new Set();
	account.asked = [];
});

describe("useCanReceiveSwapLeftovers", () => {
	it.each([
		{
			case: "one hop, everything receivable",
			path: [USDT, DOT],
			unreceivable: [],
			expected: true,
		},
		{
			case: "one hop, output not receivable",
			path: [USDT, DOT],
			unreceivable: [DOT],
			expected: false,
		},
		{
			case: "one hop, input not receivable if the swap fails",
			path: [USDT, DOT],
			unreceivable: [USDT],
			expected: false,
		},
		{
			case: "two hops, everything receivable",
			path: [USDT, PINK],
			unreceivable: [],
			expected: true,
		},
		{
			case: "two hops, DOT left by a failed second hop not receivable",
			path: [USDT, PINK],
			unreceivable: [DOT],
			expected: false,
		},
		{
			case: "two hops, output not receivable",
			path: [USDT, PINK],
			unreceivable: [PINK],
			expected: false,
		},
	] as const)("$case: $expected", ({ path, unreceivable, expected }) => {
		account.unreceivableTokenIds = new Set(unreceivable);

		expect(check(path[0], path[1])).toEqual({
			isLoading: false,
			canReceive: expected,
		});
	});

	it("asks for each amount a hop can leave behind", () => {
		check(USDT, PINK);

		expect(account.asked).toEqual([
			{ tokenId: USDT, plancks: 1000n },
			{ tokenId: DOT, plancks: 9900n },
			{ tokenId: PINK, plancks: 99000n },
		]);
	});

	it.each([
		["without a DOT balance, even to an output that is sufficient", 0n, false],
		["with a DOT balance", 1n, true],
	])(
		"lets a non-sufficient input come back %s: %s",
		(_, nativeBalance, expected) => {
			account.nativeBalance = nativeBalance;

			expect(check(PINK, USDT).canReceive).toBe(expected);
		},
	);

	it("lets a DOT input come back without a DOT balance", () => {
		expect(check(DOT, USDT).canReceive).toBe(true);
	});

	it("waits for every check", () => {
		account.loadingTokenIds = new Set([PINK]);

		expect(check(USDT, PINK)).toEqual({
			isLoading: true,
			canReceive: undefined,
		});
	});

	it("has nothing to say before the quote", () => {
		const { route } = getRoute(USDT, PINK);

		expect(
			renderHook(() =>
				useCanReceiveSwapLeftovers({
					route,
					beneficiary: BENEFICIARY,
					pathQuote: undefined,
				}),
			).result.current,
		).toEqual({ isLoading: false, canReceive: undefined });
	});
});
