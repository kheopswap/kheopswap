import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../registry/tokens/tokens";
import type { TokenId } from "../../registry/tokens/types";
import { getXcmV5MultilocationFromTokenId } from "../../registry/utils/xcmMultiLocation";
import type { TransactionRecord } from "../../state/transactions/types";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import { SwapFollowUpContent } from "./SwapFollowUpContent";

afterEach(cleanup);

const DOT = "native::pah";
const USDT = "asset::pah::1984";
const USDC = "asset::pah::1337";
const ACCOUNT = "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo";

const getToken = (tokenId: TokenId) => {
	const token = KNOWN_TOKENS_MAP[tokenId];
	if (!token) throw new Error(`unknown token ${tokenId}`);
	return token;
};

const swapExecuted = (amounts: [TokenId, bigint][]): TxEvents[number] => {
	const [first] = amounts;
	const last = amounts.at(-1);
	if (!first || !last) throw new Error("a swap path needs amounts");
	return {
		type: "AssetConversion",
		value: {
			type: "SwapExecuted",
			value: {
				who: ACCOUNT,
				send_to: ACCOUNT,
				amount_in: first[1],
				amount_out: last[1],
				path: amounts.map(([tokenId, plancks]) => [
					getXcmV5MultilocationFromTokenId(tokenId),
					plancks,
				]),
			},
		},
	};
};

const getRecord = (events: TxEvents): TransactionRecord =>
	({
		id: "swap",
		type: "swap",
		status: "inBlock",
		txEvents: [{ type: "inBestBlock", ok: true, events }],
		followUpData: {
			slippage: 0.005,
			tokenOut: getToken(USDT),
			minPlancksOut: 9_800_000n,
			swapPlancksOut: 9_850_000n,
		},
	}) as unknown as TransactionRecord;

describe("SwapFollowUpContent", () => {
	it("reports what the last hop of a swap through DOT delivered", () => {
		render(
			<SwapFollowUpContent
				transaction={getRecord([
					swapExecuted([
						[USDC, 10_000_000n],
						[DOT, 117_000_000_000n],
						[USDT, 9_912_300n],
					]),
				])}
			/>,
		);

		expect(screen.getByText("Effective outcome")).toBeVisible();
		expect(screen.getByText("9.912 USDt")).toBeInTheDocument();
		expect(screen.getByText("-0.63%")).toBeInTheDocument();
	});
});
