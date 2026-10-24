import { renderHook } from "@testing-library/react";
import { firstValueFrom, Subject } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getToastView } from "../../state/transactions/TransactionToasts";
import {
	dismissTransaction,
	transactions$,
} from "../../state/transactions/transactionStore";
import { useTransactionSubmit } from "./useTransactionSubmit";

vi.mock("../../utils/notifyError", () => ({ notifyError: vi.fn() }));

const account = {
	platform: "polkadot",
	address: "5Signer",
	isPlaceholder: false,
	txCreator: {},
} as never;
const feeToken = { id: "native::pah" } as never;

const renderSubmit = (overrides: {
	options?: object;
	feeEstimate?: bigint | null;
}) =>
	renderHook(() =>
		useTransactionSubmit({
			account,
			call: { createSubmitAndWatch: () => new Subject() } as never,
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
		}),
	).result.current;

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

	it("fails a transaction that is not finalized within 10 minutes with a reason the toast shows", async () => {
		vi.useFakeTimers();
		await renderSubmit({}).onSubmit();
		vi.advanceTimersByTime(10 * 60_000);

		const [record] = await firstValueFrom(transactions$);
		if (!record) throw new Error("no record");
		expect(record).toMatchObject({
			status: "failed",
			txEvents: [
				{ type: "pending" },
				{ type: "error", error: expect.any(Error) },
			],
		});
		expect(getToastView(record, null)).toEqual({
			outcome: "error",
			text: "Transaction was not finalized within 10 minutes",
		});
	});
});
