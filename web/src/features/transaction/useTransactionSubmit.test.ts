import { renderHook } from "@testing-library/react";
import { firstValueFrom, Subject } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
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
			transactionType: "transfer",
			transactionTitle: "Transfer",
			followUpData: {},
			...overrides,
		}),
	).result.current;

afterEach(async () => {
	for (const tx of await firstValueFrom(transactions$))
		dismissTransaction(tx.id);
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
});
