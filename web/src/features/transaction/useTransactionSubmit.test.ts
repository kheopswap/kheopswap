import { renderHook } from "@testing-library/react";
import type { TxEvent } from "polkadot-api";
import { firstValueFrom, Subject } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getToastView } from "../../state/transactions/TransactionToasts";
import {
	dismissTransaction,
	transactions$,
} from "../../state/transactions/transactionStore";
import {
	TX_EXPIRED_MESSAGE,
	TX_EXPIRY_MS,
	useTransactionSubmit,
} from "./useTransactionSubmit";

vi.mock("../../utils/notifyError", () => ({ notifyError: vi.fn() }));

const account = {
	platform: "polkadot",
	address: "5Signer",
	isPlaceholder: false,
	txCreator: {},
} as never;
const feeToken = { id: "native::pah" } as never;

const created: TxEvent = { type: "created", txHash: "0x01" };
const finalized = {
	type: "finalized",
	txHash: "0x01",
	ok: true,
	events: [],
} as unknown as TxEvent;

const renderSubmit = (overrides: {
	options?: object;
	feeEstimate?: bigint | null;
	onReset?: () => void;
	txEvents$?: Subject<TxEvent>;
}) => {
	const txEvents$ = overrides.txEvents$ ?? new Subject<TxEvent>();
	const onReset = overrides.onReset ?? vi.fn();
	const { onSubmit } = renderHook(() =>
		useTransactionSubmit({
			account,
			call: { createSubmitAndWatch: () => txEvents$ } as never,
			chainId: "pah",
			feeEstimate: 1n,
			feeToken,
			nativeToken: feeToken,
			options: { nonce: 1 },
			isEthereumNetworkMismatch: false,
			targetEvmChainId: undefined,
			followUp: { type: "transfer" },
			transactionTitle: "Transfer",
			...overrides,
			onReset,
		}),
	).result.current;
	return { onSubmit, onReset, txEvents$ };
};

const getRecord = async () => {
	const [record] = await firstValueFrom(transactions$);
	if (!record) throw new Error("no record");
	return record;
};

afterEach(async () => {
	for (const tx of await firstValueFrom(transactions$))
		dismissTransaction(tx.id);
	vi.useRealTimers();
});

describe("useTransactionSubmit", () => {
	it("records nothing when the transaction options are not ready", async () => {
		await renderSubmit({ options: undefined }).onSubmit();
		expect(await firstValueFrom(transactions$)).toEqual([]);
	});

	it("records nothing when the fee is not estimated", async () => {
		await renderSubmit({ feeEstimate: null }).onSubmit();
		expect(await firstValueFrom(transactions$)).toEqual([]);
	});

	it("records a pending transaction once it is submitted to the wallet", async () => {
		await renderSubmit({}).onSubmit();
		expect(await firstValueFrom(transactions$)).toMatchObject([
			{ status: "pending", title: "Transfer" },
		]);
	});

	it("resets the form once the wallet has signed, not before", async () => {
		const { onSubmit, onReset, txEvents$ } = renderSubmit({});
		await onSubmit();
		expect(onReset).not.toHaveBeenCalled();

		txEvents$.next(created);
		expect(onReset).toHaveBeenCalledTimes(1);

		txEvents$.next({ type: "broadcasted", txHash: "0x01" });
		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it("keeps the form when the wallet rejects the signature", async () => {
		const { onSubmit, onReset, txEvents$ } = renderSubmit({});
		await onSubmit();
		txEvents$.error({ code: 4001, message: "User rejected the request" });

		expect(onReset).not.toHaveBeenCalled();
		expect((await getRecord()).status).toBe("failed");
	});

	it("tears down the transaction stream once it is finalized", async () => {
		const { onSubmit, txEvents$ } = renderSubmit({});
		await onSubmit();
		expect(txEvents$.observed).toBe(true);

		txEvents$.next(finalized);
		expect(txEvents$.observed).toBe(false);
		expect((await getRecord()).status).toBe("finalized");
	});

	it("marks a transaction unconfirmed after 10 minutes and still records a later finalization", async () => {
		vi.useFakeTimers();
		const { onSubmit, txEvents$ } = renderSubmit({});
		await onSubmit();
		txEvents$.next(created);
		vi.advanceTimersByTime(10 * 60_000);

		const unconfirmed = await getRecord();
		expect(unconfirmed.status).toBe("unconfirmed");
		expect(getToastView(unconfirmed, null)).toEqual({
			outcome: "warning",
			text: "Not confirmed after 10 minutes, still watching...",
		});
		expect(txEvents$.observed).toBe(true);

		txEvents$.next(finalized);
		const record = await getRecord();
		expect(record.status).toBe("finalized");
		expect(getToastView(record, null)).toEqual({
			outcome: "success",
			text: "Finalized",
		});
		expect(txEvents$.observed).toBe(false);
	});

	it("fails a transaction that outlives its mortality window with a reason the toast shows", async () => {
		vi.useFakeTimers();
		const { onSubmit, txEvents$ } = renderSubmit({});
		await onSubmit();
		vi.advanceTimersByTime(TX_EXPIRY_MS);

		const record = await getRecord();
		expect(record).toMatchObject({
			status: "failed",
			txEvents: [
				{ type: "pending" },
				{ type: "unconfirmed" },
				{ type: "error", error: expect.any(Error) },
			],
		});
		expect(getToastView(record, null)).toEqual({
			outcome: "error",
			text: TX_EXPIRED_MESSAGE,
		});
		expect(txEvents$.observed).toBe(false);
	});
});
