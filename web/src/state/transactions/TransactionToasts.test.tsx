import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import { firstValueFrom, type Subject } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getChainById } from "../../registry/chains/chains";
import { KNOWN_TOKENS_MAP } from "../../registry/tokens/tokens";
import { clearCachedObservables } from "../../utils/getCachedObservable";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import { GlobalFollowUpModal } from "./GlobalFollowUpModal";
import { TransactionsProvider } from "./TransactionsProvider";
import {
	getToastAutoClose,
	getToastView,
	TransactionToasts,
} from "./TransactionToasts";
import {
	addTransaction,
	dismissTransaction,
	openTransactionModal,
	transactions$,
} from "./transactionStore";
import type {
	TransactionRecord,
	TransactionType,
	XcmTransferFollowUpData,
} from "./types";
import type { XcmArrival } from "./xcmArrival";

type BlockRecords = { phase: { type: string }; event: TxEvents[number] }[];

const hydration = vi.hoisted(() => ({
	best$: undefined as unknown as Subject<BlockRecords>,
	finalized$: undefined as unknown as Subject<BlockRecords>,
}));

vi.mock("../../papi/getApi", async () => {
	const { map, of, Subject } = await import("rxjs");
	hydration.best$ = new Subject();
	hydration.finalized$ = new Subject();
	return {
		getApi$: () =>
			of({
				query: {
					System: {
						Events: {
							watchValue: ({ at }: { at: "best" | "finalized" }) =>
								hydration[`${at}$`].pipe(
									map((value, index) => ({
										block: { number: index, hash: `0x${index}` },
										value,
									})),
								),
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

vi.mock("../../components/Pulse", () => ({
	Pulse: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
	returnTokenIds: [DOT_ON_HYDRATION],
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
	clearCachedObservables();
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
		const toast = await screen.findByText("Sent, awaiting Hydration...");

		fireEvent.click(toast);
		const modal = await screen.findByRole("dialog");
		expect(
			within(modal).getByText("Transfer DOT to Hydration"),
		).toBeInTheDocument();
		expect(
			within(modal).getByText("Sent, awaiting Hydration..."),
		).toBeInTheDocument();

		const arrivalBlock = arrivalOnHydration.map((event) => ({
			phase: { type: "Initialization" },
			event,
		}));
		act(() => hydration.best$.next(arrivalBlock));
		expect(
			await within(modal).findByText(
				"Arrived on Hydration, awaiting finalization",
			),
		).toBeInTheDocument();
		closeModal();
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(await isInStore(record.id)).toBe(true);

		act(() => hydration.finalized$.next(arrivalBlock));
		expect(await screen.findByText("Arrived on Hydration")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Arrived on Hydration"));
		expect(
			within(await screen.findByRole("dialog")).getByText(
				"Arrived on Hydration",
			),
		).toBeInTheDocument();

		closeModal();
		expect(await isInStore(record.id)).toBe(false);
	});

	it("headlines the modal with the destination failure of a finalized transfer", async () => {
		const record = getFinalizedRecord(
			"xcm-transfer",
			"xcmTransfer",
			"Transfer DOT to Hydration",
		);
		await openAndClose(record);
		const failedBlock = [
			{
				phase: { type: "Initialization" },
				event: {
					type: "MessageQueue",
					value: {
						type: "Processed",
						value: {
							id: MESSAGE_ID,
							origin: { type: "Sibling", value: 1000 },
							success: false,
						},
					},
				},
			},
		];
		act(() => hydration.finalized$.next(failedBlock));

		fireEvent.click(await screen.findByText("Failed on Hydration"));
		const modal = await screen.findByRole("dialog");
		expect(within(modal).getByText("Failed on Hydration")).toBeInTheDocument();
		expect(within(modal).queryByText("Transaction succeeded")).toBeNull();
	});

	it("minimizes a swap that failed in a best block until the finalized verdict", async () => {
		const record: TransactionRecord = {
			...getFinalizedRecord("swap", "swap", "Swap DOT/USDC"),
			status: "failed",
			txEvents: [
				{ type: "inBestBlock", ok: false, txHash: "0x01", events: [] },
			] as unknown as TransactionRecord["txEvents"],
		};
		await openAndClose(record);

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(await isInStore(record.id)).toBe(true);
	});

	it("dismisses a finalized swap", async () => {
		const record = getFinalizedRecord("swap", "swap", "Swap DOT/USDC");
		await openAndClose(record);

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(await isInStore(record.id)).toBe(false);
	});
});

describe("getToastAutoClose", () => {
	const failedIn = (
		inclusion: "inBestBlock" | "finalized" | "error",
	): TransactionRecord => ({
		...getFinalizedRecord("swap", "swap", "Swap DOT/USDC"),
		status: "failed",
		txEvents: [
			inclusion === "error"
				? { type: "error", error: new Error("rejected") }
				: { type: inclusion, ok: false, txHash: "0x01", events: [] },
		] as TransactionRecord["txEvents"],
	});

	it("keeps a failure that a best block may still retract", () => {
		expect(getToastAutoClose(failedIn("inBestBlock"))).toBe(false);
	});

	it("auto-closes a failure that is finalized or errored", () => {
		expect(getToastAutoClose(failedIn("finalized"))).toBe(5_000);
		expect(getToastAutoClose(failedIn("error"))).toBe(5_000);
	});

	it("keeps a finalized success until the user dismisses it", () => {
		expect(
			getToastAutoClose(getFinalizedRecord("swap", "swap", "Swap DOT/USDC")),
		).toBe(false);
	});
});

describe("getToastView", () => {
	const transfer = getFinalizedRecord(
		"xcm-transfer",
		"xcmTransfer",
		"Transfer DOT to Hydration",
	);

	it.each<[XcmArrival | null, ReturnType<typeof getToastView>]>([
		[null, { outcome: "loading", text: "Sent, awaiting Hydration..." }],
		[
			{ status: "in-transit", messageId: MESSAGE_ID },
			{ outcome: "loading", text: "Sent, awaiting Hydration..." },
		],
		[
			{
				status: "arrived",
				messageId: MESSAGE_ID,
				received: 1n,
				finalized: false,
			},
			{
				outcome: "success",
				text: "Arrived on Hydration, awaiting finalization",
			},
		],
		[
			{
				status: "arrived",
				messageId: MESSAGE_ID,
				received: 1n,
				finalized: true,
			},
			{ outcome: "success", text: "Arrived on Hydration" },
		],
		[
			{
				status: "failed-on-destination",
				messageId: MESSAGE_ID,
				returned: [],
				trapped: true,
				finalized: true,
			},
			{ outcome: "error", text: "Failed on Hydration, assets trapped" },
		],
		[
			{
				status: "failed-on-destination",
				messageId: MESSAGE_ID,
				returned: [{ tokenId: DOT_ON_HYDRATION, plancks: 1n }],
				trapped: false,
				finalized: true,
			},
			{ outcome: "error", text: "Failed on Hydration, funds returned" },
		],
		[
			{
				status: "failed-on-destination",
				messageId: MESSAGE_ID,
				returned: [],
				trapped: false,
				finalized: true,
			},
			{ outcome: "error", text: "Failed on Hydration" },
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

	it("shows a provisional destination failure while the origin waits for finality", () => {
		expect(
			getToastView(
				{ ...transfer, status: "inBlock" },
				{
					status: "failed-on-destination",
					messageId: MESSAGE_ID,
					returned: [],
					trapped: false,
					finalized: false,
				},
			),
		).toEqual({ outcome: "error", text: "Failed on Hydration" });
	});

	it("shows other transactions as finalized", () => {
		expect(
			getToastView(getFinalizedRecord("swap", "swap", "Swap DOT/USDC"), null),
		).toEqual({ outcome: "success", text: "Finalized" });
	});
});
