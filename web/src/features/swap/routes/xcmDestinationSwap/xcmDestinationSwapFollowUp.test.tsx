import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../../../registry/tokens/tokens";
import type { TransactionRecord } from "../../../../state/transactions/types";
import type {
	XcmArrival,
	XcmTransferFollowUpData,
} from "../../../../state/transactions/xcmArrival";
import { XcmTransferFollowUpContent } from "../xcmTransfer/XcmTransferFollowUpContent";
import { usdtToPink } from "./xcmDestinationSwap.fixtures";

const arrival = vi.hoisted(() => ({ current: null as XcmArrival | null }));

vi.mock("../../../../state/transactions/xcmArrival", async (importActual) => ({
	...(await importActual()),
	useXcmArrival: () => arrival.current,
}));

vi.mock("../../../../hooks/useToken", async () => {
	const { KNOWN_TOKENS_MAP } = await import(
		"../../../../registry/tokens/tokens"
	);
	return {
		useToken: ({ tokenId }: { tokenId: string }) => ({
			data: KNOWN_TOKENS_MAP[tokenId] ?? null,
			isLoading: false,
		}),
	};
});

afterEach(cleanup);

const DOT = "native::pah";
const USDT = "asset::pah::1984";

const tokenOut = KNOWN_TOKENS_MAP[usdtToPink.tokenIdOut];
if (!tokenOut) throw new Error(`unknown token ${usdtToPink.tokenIdOut}`);

const followUpData: XcmTransferFollowUpData = {
	origin: "hydration",
	target: { tokenId: usdtToPink.tokenIdOut, beneficiary: usdtToPink.sender },
	returnTokenIds: [USDT, DOT, usdtToPink.tokenIdOut],
	tokenOut,
	estimatedReceived: 497686228859862n,
};

const record = {
	id: "xcm-destination-swap",
	type: "xcmDestinationSwap",
	status: "finalized",
	txEvents: [],
	followUpData,
} as unknown as TransactionRecord;

const failed = (
	returned: { tokenId: string; plancks: bigint }[],
	trapped: boolean,
): XcmArrival => ({
	status: "failed-on-destination",
	messageId: "0x01",
	returned,
	trapped,
	finalized: true,
});

describe("follow-up of a swap on Asset Hub of what Hydration sends", () => {
	it("lists what Asset Hub returned when the swap fails", () => {
		arrival.current = failed(
			[
				{ tokenId: USDT, plancks: 288n },
				{ tokenId: DOT, plancks: 95772838701n },
			],
			false,
		);
		render(<XcmTransferFollowUpContent transaction={record} />);

		expect(screen.getByText("Arrival on Polkadot Asset Hub")).toBeVisible();
		expect(screen.getByText("Failed, funds returned")).toBeVisible();
		expect(screen.getByText("Returned").parentElement).toHaveTextContent(
			"Returned0.0003 USDt+9.577 DOT",
		);
		expect(screen.queryByText(/trapped/)).toBeNull();
	});

	it("says some assets were trapped when Asset Hub kept part of them", () => {
		arrival.current = failed([{ tokenId: DOT, plancks: 95772838701n }], true);
		render(<XcmTransferFollowUpContent transaction={record} />);

		expect(screen.getByText("Failed, some assets trapped")).toBeVisible();
		expect(screen.getByText("Returned")).toBeVisible();
	});

	it("says the assets were trapped when nothing came back", () => {
		arrival.current = failed([], true);
		render(<XcmTransferFollowUpContent transaction={record} />);

		expect(screen.getByText("Failed, assets trapped")).toBeVisible();
		expect(screen.queryByText("Returned")).toBeNull();
	});

	it("shows the swapped output once it arrives", () => {
		arrival.current = {
			status: "arrived",
			messageId: "0x01",
			received: 497686228859862n,
			finalized: true,
		};
		render(<XcmTransferFollowUpContent transaction={record} />);

		expect(screen.getByText("Arrived")).toBeVisible();
		expect(screen.getByText("Received")).toBeVisible();
	});
});
