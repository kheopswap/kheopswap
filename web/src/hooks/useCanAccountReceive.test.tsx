import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KNOWN_TOKENS_MAP } from "../registry/tokens/tokens";
import type { TokenId } from "../registry/tokens/types";
import {
	getRecipientMinimumMessage,
	useCanAccountReceive,
} from "./useCanAccountReceive";

const DOT = "native::pah";
const USDC = "asset::pah::1337";
const DED = "asset::pah::30";
const RECIPIENT = "5Recipient";

const held = vi.hoisted(() => ({ balances: {} as Record<string, bigint> }));

vi.mock("./useExistentialDeposit", () => ({
	useExistentialDeposit: ({ tokenId }: { tokenId: TokenId }) => ({
		data: tokenId === USDC ? 70_000n : tokenId === DED ? 1n : 100_000_000n,
		isLoading: false,
	}),
}));
vi.mock("./useTokensByChainId", async () => {
	const { KNOWN_TOKENS_MAP } = await import("../registry/tokens/tokens");
	return {
		useTokensByChainId: () => ({
			data: {
				[DOT]: KNOWN_TOKENS_MAP[DOT],
				[USDC]: KNOWN_TOKENS_MAP[USDC],
				[DED]: { ...KNOWN_TOKENS_MAP[DED], isSufficient: false },
			},
			isLoading: false,
		}),
	};
});
vi.mock("./useBalances", () => ({
	useBalances: ({
		balanceDefs,
	}: {
		balanceDefs: { address: string; tokenId: string }[];
	}) => ({
		data: balanceDefs.map(({ address, tokenId }) => ({
			address,
			tokenId,
			balance: held.balances[tokenId] ?? 0n,
			isLoading: false,
		})),
		isLoading: false,
	}),
}));

const check = (tokenId: TokenId, plancks: bigint) =>
	renderHook(() =>
		useCanAccountReceive({ address: RECIPIENT, tokenId, plancks }),
	).result.current.data;

describe("useCanAccountReceive", () => {
	beforeEach(() => {
		held.balances = {};
	});

	it("names the minimum a recipient without the token needs", () => {
		expect(check(USDC, 20_000n)).toEqual({
			canReceive: false,
			reason: "The recipient needs at least 0.07 USDC",
		});
	});

	it("names only the missing part when the recipient holds some of the token", () => {
		held.balances = { [USDC]: 50_000n };
		expect(check(USDC, 10_000n)).toEqual({
			canReceive: false,
			reason: "The recipient needs at least 0.02 USDC",
		});
	});

	it("accepts an amount that completes the minimum", () => {
		held.balances = { [USDC]: 50_000n };
		expect(check(USDC, 20_000n)).toEqual({ canReceive: true });
	});

	it("keeps the eligibility failure distinct from the minimum", () => {
		expect(check(DED, 1n)).toEqual({
			canReceive: false,
			reason: "Account has no sufficient assets",
		});
	});

	it("lets an account that holds DOT receive a non-sufficient token", () => {
		held.balances = { [DOT]: 1_000_000_000n };
		expect(check(DED, 1n)).toEqual({ canReceive: true });
	});
});

describe("getRecipientMinimumMessage", () => {
	const token = KNOWN_TOKENS_MAP[DOT];
	if (!token) throw new Error("missing DOT");

	it("rounds the amount up, never down", () => {
		expect(getRecipientMinimumMessage(33_333_333n, token)).toBe(
			"The recipient needs at least 0.003334 DOT",
		);
	});

	it("keeps a short amount exact", () => {
		expect(getRecipientMinimumMessage(100_000_000n, token)).toBe(
			"The recipient needs at least 0.01 DOT",
		);
	});
});
