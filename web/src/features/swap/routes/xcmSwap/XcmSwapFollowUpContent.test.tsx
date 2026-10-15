import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../../../registry/tokens/tokens";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import type { TransactionRecord } from "../../../../state/transactions/types";
import type { TxEvents } from "../../../../utils/getErrorMessageFromTxEvents";
import type { XcmSwapFollowUpData } from "../xcm/useXcmRoute";
import { getAmmPath } from "./ammPath";
import { XcmSwapFollowUpContent } from "./XcmSwapFollowUpContent";
import { usdcToUsdt } from "./xcmSwap.fixtures";

afterEach(cleanup);

const DOT = "native::pah";
const USDT = "asset::pah::1984";
const USDC = "asset::pah::1337";

const getToken = (tokenId: string) => {
	const token = KNOWN_TOKENS_MAP[tokenId];
	if (!token) throw new Error(`unknown token ${tokenId}`);
	return token;
};

const followUpData: XcmSwapFollowUpData = {
	origin: "pah",
	target: {
		tokenId: "hydration-asset::hydration::10",
		beneficiary: usdcToUsdt.sender,
	},
	tokenOut: getToken("hydration-asset::hydration::10"),
	estimatedReceived: 98_764_625n,
	swap: {
		path: getAmmPath(USDC, USDT, DOT),
		swapPlancksIn: usdcToUsdt.swapAmount,
		swapPlancksOut: 98_000_000n,
		mirrorToken: getToken(USDT),
	},
};

const feePaymentSwap: TxEvents[number] = {
	type: "AssetConversion",
	value: {
		type: "SwapCreditExecuted",
		value: {
			amount_in: usdcToUsdt.swapAmount,
			amount_out: 12_345_000n,
			path: [
				[getXcmV5MultilocationFromTokenId(USDT), usdcToUsdt.swapAmount],
				[getXcmV5MultilocationFromTokenId(DOT), 12_345_000n],
			],
		},
	},
};

const getRecord = (events: TxEvents): TransactionRecord =>
	({
		id: "xcm-swap",
		type: "xcmSwap",
		status: "inBlock",
		txEvents: [{ type: "inBestBlock", ok: true, events }],
		followUpData,
	}) as unknown as TransactionRecord;

describe("XcmSwapFollowUpContent", () => {
	it("shows the output of the last swap hop, ignoring the fee payment swap", () => {
		if (!usdcToUsdt.origin.success) throw new Error("fixture origin failed");
		render(
			<XcmSwapFollowUpContent
				transaction={getRecord([
					feePaymentSwap,
					...usdcToUsdt.origin.value.emitted_events,
				])}
			/>,
		);

		expect(screen.getByText("Effective outcome")).toBeVisible();
		expect(screen.getByText("98.77 USDt")).toBeInTheDocument();
		expect(screen.getByText("-0.78%")).toBeInTheDocument();
	});
});
