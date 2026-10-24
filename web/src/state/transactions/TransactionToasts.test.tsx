import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { ToastContainer } from "react-toastify";
import { firstValueFrom, type Subject } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getChainById } from "../../registry/chains/chains";
import { KNOWN_TOKENS_MAP } from "../../registry/tokens/tokens";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import { GlobalFollowUpModal } from "./GlobalFollowUpModal";
import { TransactionsProvider } from "./TransactionsProvider";
import { getToastView, TransactionToasts } from "./TransactionToasts";
import {
	addTransaction,
	dismissTransaction,
	openTransactionModal,
	transactions$,
} from "./transactionStore";
import type { TransactionRecord, TransactionType } from "./types";
import type { XcmArrival, XcmTransferFollowUpData } from "./xcmArrival";

const hydration = vi.hoisted(() => ({
	blocks$: undefined as unknown as Subject<
		{ phase: { type: string }; event: TxEvents[number] }[]
	>,
}));

vi.mock("../../papi/getApi", async () => {
	const { map, of, Subject } = await import("rxjs");
	hydration.blocks$ = new Subject();
	return {
		getApi$: () =>
			of({
				query: {
					System: {
						Events: {
							watchValue: () =>
								hydration.blocks$.pipe(map((value) => ({ value }))),
						},
					},
				},
			}),
	};
});

vi.mock("../../components/icons", () => ({
	SpinnerIcon: () => null,
	SpinnerBasicIcon: () => null,
}));

const MESSAGE_ID =
	"0x6c79370c66515d9e929b9cca10beb95e43247e2469d15c1586b8506d273b631b";
const BENEFICIARY = "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo";
const DOT_ON_HYDRATION = "hydration-asset::hydration::5";

const sentToHydration = {
	type: "PolkadotXcm",
	value: {
		type: "Sent",
		value: {
			destination: {
				parents: 1,
				interior: {
					type: "X1",
					value: {
						type: "Parachain",
						value: getChainById("hydration").paraId,
					},
				},
			},
			message_id: MESSAGE_ID,
		},
	},
};

const arrivalOnHydration: TxEvents = [
	{
		type: "Tokens",
		value: {
			type: "Deposited",
			value: { currency_id: 5, who: BENEFICIARY, amount: 9995190152n },
		},
	},
	{
		type: "MessageQueue",
		value: {
			type: "Processed",
			value: {
				id: MESSAGE_ID,
				origin: { type: "Sibling", value: 1000 },
				success: true,
			},
		},
	},
];

const followUpData: XcmTransferFollowUpData = {
	origin: "pah",
	target: { tokenId: DOT_ON_HYDRATION, beneficiary: BENEFICIARY },
	tokenOut: KNOWN_TOKENS_MAP[DOT_ON_HYDRATION] as never,
	estimatedReceived: 9995190152n,
};

const getFinalizedRecord = (
	id: string,
	type: TransactionType,
	title: string,
): TransactionRecord =>
	({
		id,
		createdAt: Date.now(),
		type,
		title,
		status: "finalized",
		txHash: "0x01",
		txEvents: [
			{
				type: "finalized",
				ok: true,
				txHash: "0x01",
				events: type === "xcmTransfer" ? [sentToHydration] : [],
			},
		],
		account: { platform: "polkadot", walletName: "Test" },
		feeEstimate: 0n,
		feeToken: KNOWN_TOKENS_MAP["native::pah"],
		followUpData: type === "xcmTransfer" ? followUpData : {},
	}) as unknown as TransactionRecord;

const renderApp = () =>
	render(
		<TransactionsProvider>
			<GlobalFollowUpModal contentMap={{}} />
			<TransactionToasts />
			<ToastContainer />
		</TransactionsProvider>,
	);

const isInStore = async (id: string) =>
	(await firstValueFrom(transactions$)).some((tx) => tx.id === id);

const getModal = () => screen.getByRole("dialog");

const closeModal = () =>
	fireEvent.click(within(getModal()).getByRole("button", { name: "Close" }));

const openAndClose = async (record: TransactionRecord) => {
	renderApp();
	act(() => {
		addTransaction(record);
		openTransactionModal(record.id);
	});
	await screen.findByRole("dialog");
	closeModal();
};

afterEach(async () => {
	for (const tx of await firstValueFrom(transactions$))
		act(() => dismissTransaction(tx.id));
	cleanup();
});

describe("closing the follow-up modal", () => {
	it("keeps a finalized transfer visible until it arrives on Hydration", async () => {
		const record = getFinalizedRecord(
			"xcm-transfer",
			"xcmTransfer",
			"Transfer DOT to Hydration",
		);
		await openAndClose(record);

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(await isInStore(record.id)).toBe(true);
		const toast = await screen.findByText("In transit to Hydration...");

		fireEvent.click(toast);
		expect(
			within(await screen.findByRole("dialog")).getByText(
				"Transfer DOT to Hydration",
			),
		).toBeInTheDocument();

		act(() =>
			hydration.blocks$.next(
				arrivalOnHydration.map((event) => ({
					phase: { type: "Initialization" },
					event,
				})),
			),
		);
		expect(await screen.findByText("Arrived on Hydration")).toBeInTheDocument();

		closeModal();
		expect(await isInStore(record.id)).toBe(false);
	});

	it("dismisses a finalized swap", async () => {
		const record = getFinalizedRecord("swap", "swap", "Swap DOT/USDC");
		await openAndClose(record);

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(await isInStore(record.id)).toBe(false);
	});
});

describe("getToastView", () => {
	const transfer = getFinalizedRecord(
		"xcm-transfer",
		"xcmTransfer",
		"Transfer DOT to Hydration",
	);

	it.each<[XcmArrival | null, ReturnType<typeof getToastView>]>([
		[null, { outcome: "loading", text: "In transit to Hydration..." }],
		[
			{ status: "in-transit", messageId: MESSAGE_ID },
			{ outcome: "loading", text: "In transit to Hydration..." },
		],
		[
			{ status: "arrived", messageId: MESSAGE_ID, received: 1n },
			{ outcome: "success", text: "Arrived on Hydration" },
		],
		[
			{ status: "failed-on-destination", messageId: MESSAGE_ID },
			{ outcome: "error", text: "Failed on Hydration, assets trapped" },
		],
		[
			{ status: "unconfirmed", messageId: MESSAGE_ID },
			{ outcome: "warning", text: "Arrival on Hydration not confirmed" },
		],
	])("shows a finalized transfer with arrival %o as %o", (arrival, view) => {
		expect(getToastView(transfer, arrival)).toEqual(view);
	});

	it("shows the origin status before finalization", () => {
		expect(getToastView({ ...transfer, status: "inBlock" }, null)).toEqual({
			outcome: "loading",
			text: "In block, waiting for finalization...",
		});
	});

	it("shows other transactions as finalized", () => {
		expect(
			getToastView(getFinalizedRecord("swap", "swap", "Swap DOT/USDC"), null),
		).toEqual({ outcome: "success", text: "Finalized" });
	});
});
