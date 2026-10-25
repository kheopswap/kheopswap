import { renderHook } from "@testing-library/react";
import type { TxEvent } from "polkadot-api";
import { type BehaviorSubject, firstValueFrom, Subject } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getToastAutoClose,
	getToastView,
} from "../../state/transactions/TransactionToasts";
import {
	dismissTransaction,
	transactions$,
} from "../../state/transactions/transactionStore";
import { useTransactionSubmit } from "./useTransactionSubmit";

vi.mock("../../utils/notifyError", () => ({ notifyError: vi.fn() }));

type FinalizedBlock = { number: number; nonce: number };

const chain = vi.hoisted(() => ({
	finalized$: undefined as unknown as BehaviorSubject<FinalizedBlock>,
	isDown: false,
}));

const ethereum = vi.hoisted(() => ({
	txEvents$: undefined as unknown as Subject<TxEvent>,
}));

vi.mock("../../papi/getApi", async () => {
	const { BehaviorSubject, defer, map, of, throwError } = await import("rxjs");
	chain.finalized$ = new BehaviorSubject<FinalizedBlock>({
		number: 100,
		nonce: 1,
	});
	const toBlock = ({ number }: FinalizedBlock) => ({
		number,
		hash: `0x${number}`,
	});
	const finalized$ = () =>
		defer(() =>
			chain.isDown
				? throwError(() => new Error("chain down"))
				: chain.finalized$,
		);
	const api = {
		query: {
			System: {
				Number: {
					watchValue: () =>
						chain.finalized$.pipe(
							map((finalized) => ({
								block: toBlock(finalized),
								value: finalized.number,
							})),
						),
				},
				Account: {
					watchValue: () =>
						finalized$().pipe(
							map((finalized) => ({
								block: toBlock(finalized),
								value: { nonce: finalized.nonce },
							})),
						),
					getValue: () =>
						firstValueFrom(finalized$().pipe(map(({ nonce }) => ({ nonce })))),
				},
			},
		},
	};
	return { getApi: async () => api, getApi$: () => of(api) };
});

vi.mock("./createEthereumTxObservable", () => ({
	createEthereumTxObservable: () => ethereum.txEvents$,
}));

const txCreator = {};
const polkadotAccount = {
	platform: "polkadot",
	address: "5Signer",
	isPlaceholder: false,
	txCreator,
} as never;
const ethereumAccount = {
	platform: "ethereum",
	address: "0xSigner",
	isPlaceholder: false,
	client: {},
} as never;
const feeToken = { id: "native::pah" } as never;

const created: TxEvent = { type: "created", txHash: "0x01" };
const broadcasted: TxEvent = { type: "broadcasted", txHash: "0x01" };
const inBestBlock = {
	type: "inBestBlock",
	txHash: "0x01",
	ok: true,
	events: [],
} as unknown as TxEvent;
const finalized = {
	type: "finalized",
	txHash: "0x01",
	ok: true,
	events: [],
} as unknown as TxEvent;

const TEN_MINUTES = 10 * 60_000;
const DEATH_BLOCK = 100 + 64;

const renderSubmit = (overrides: {
	account?: never;
	signerAddress?: string | null;
	options?: object;
	feeEstimate?: bigint | null;
	onReset?: () => void;
}) => {
	const txEvents$ = new Subject<TxEvent>();
	const createSubmitAndWatch = vi.fn(() => txEvents$);
	const onReset = overrides.onReset ?? vi.fn();
	const { onSubmit } = renderHook(() =>
		useTransactionSubmit({
			account: polkadotAccount,
			signerAddress: "5Signer",
			call: {
				createSubmitAndWatch,
				getEncodedData: async () => new Uint8Array([1]),
			} as never,
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
	return { onSubmit, onReset, txEvents$, createSubmitAndWatch };
};

const getRecord = async () => {
	const [record] = await firstValueFrom(transactions$);
	if (!record) throw new Error("no record");
	return record;
};

const finalize = (number: number, nonce: number) =>
	chain.finalized$.next({ number, nonce });

const flush = () => new Promise<void>((resolve) => process.nextTick(resolve));

beforeEach(() => {
	chain.isDown = false;
	chain.finalized$.next({ number: 100, nonce: 1 });
	ethereum.txEvents$ = new Subject<TxEvent>();
});

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

	it("records nothing while the signer address is unresolved", async () => {
		await renderSubmit({ signerAddress: null }).onSubmit();
		expect(await firstValueFrom(transactions$)).toEqual([]);
	});

	it("records a pending transaction with its nonce once it is submitted to the wallet", async () => {
		await renderSubmit({}).onSubmit();
		expect(await firstValueFrom(transactions$)).toMatchObject([
			{ status: "pending", title: "Transfer", nonce: 1 },
		]);
	});

	it("anchors the mortality on the finalized block at submission", async () => {
		const { onSubmit, createSubmitAndWatch } = renderSubmit({});
		await onSubmit();
		expect(createSubmitAndWatch).toHaveBeenCalledWith(txCreator, {
			nonce: 1,
			mortality: {
				mortal: true,
				period: 64,
				at: { hash: "0x100", number: 100 },
			},
		});
	});

	it("resets the form once the wallet has signed, not before", async () => {
		const { onSubmit, onReset, txEvents$ } = renderSubmit({});
		await onSubmit();
		expect(onReset).not.toHaveBeenCalled();

		txEvents$.next(created);
		expect(onReset).toHaveBeenCalledTimes(1);

		txEvents$.next(broadcasted);
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

	it("starts the clocks when the wallet signs, not when it is asked to", async () => {
		vi.useFakeTimers();
		const { onSubmit, txEvents$ } = renderSubmit({});
		await onSubmit();
		vi.advanceTimersByTime(TEN_MINUTES);
		expect((await getRecord()).status).toBe("pending");

		txEvents$.next(created);
		vi.advanceTimersByTime(TEN_MINUTES);
		expect((await getRecord()).status).toBe("unconfirmed");
	});

	it("marks a transaction unconfirmed after 10 minutes and still records a later finalization", async () => {
		vi.useFakeTimers();
		const { onSubmit, txEvents$ } = renderSubmit({});
		await onSubmit();
		txEvents$.next(created);
		vi.advanceTimersByTime(TEN_MINUTES);

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

	it("keeps a transaction that reached a block after 10 minutes, whatever the chain does next", async () => {
		vi.useFakeTimers();
		const { onSubmit, txEvents$ } = renderSubmit({});
		await onSubmit();
		txEvents$.next(created);
		vi.advanceTimersByTime(TEN_MINUTES);
		txEvents$.next(inBestBlock);
		expect((await getRecord()).status).toBe("inBlock");

		finalize(DEATH_BLOCK + 10, 2);
		vi.advanceTimersByTime(TEN_MINUTES);
		expect((await getRecord()).status).toBe("inBlock");

		txEvents$.next(finalized);
		expect((await getRecord()).status).toBe("finalized");
	});

	it("reports a transaction the chain executed after the app lost sight of it", async () => {
		const { onSubmit, txEvents$ } = renderSubmit({});
		await onSubmit();
		txEvents$.next(created);
		txEvents$.next(broadcasted);

		finalize(DEATH_BLOCK - 1, 1);
		expect((await getRecord()).status).toBe("broadcasted");

		finalize(DEATH_BLOCK, 2);
		const record = await getRecord();
		expect(record.status).toBe("lostTrack");
		expect(getToastView(record, null)).toEqual({
			outcome: "warning",
			text: "Included, but the app lost track of it. Check the explorer",
		});
		expect(getToastAutoClose(record, null, false)).toBe(false);
		expect(txEvents$.observed).toBe(false);
	});

	it("expires a transaction the chain never executed", async () => {
		const { onSubmit, txEvents$ } = renderSubmit({});
		await onSubmit();
		txEvents$.next(created);

		finalize(DEATH_BLOCK, 1);
		const record = await getRecord();
		expect(record.status).toBe("expired");
		expect(getToastView(record, null)).toEqual({
			outcome: "error",
			text: "Expired before it was included",
		});
		expect(getToastAutoClose(record, null, false)).toBe(false);
		expect(txEvents$.observed).toBe(false);
	});

	it("keeps watching for the expiry when the chain cannot be read for a while", async () => {
		vi.useFakeTimers();
		chain.isDown = true;
		const { onSubmit, txEvents$ } = renderSubmit({});
		await onSubmit();
		txEvents$.next(created);
		finalize(DEATH_BLOCK, 1);
		expect((await getRecord()).status).toBe("signed");

		chain.isDown = false;
		vi.advanceTimersByTime(10_000);
		expect((await getRecord()).status).toBe("expired");
	});

	describe("for an Ethereum account", () => {
		const timeout = new Error(
			"Timed out while waiting for Ethereum transaction receipt",
		);

		const submitEthereum = async () => {
			const { onSubmit, createSubmitAndWatch } = renderSubmit({
				account: ethereumAccount,
				feeEstimate: null,
			});
			await onSubmit();
			expect(createSubmitAndWatch).not.toHaveBeenCalled();
			return ethereum.txEvents$;
		};

		it("reports a transaction the chain executed when the receipt times out but the nonce moved", async () => {
			const txEvents$ = await submitEthereum();
			txEvents$.next(broadcasted);
			finalize(101, 2);
			txEvents$.error(timeout);
			await flush();

			expect((await getRecord()).status).toBe("lostTrack");
		});

		it("fails a transaction whose receipt times out while the nonce stands", async () => {
			const txEvents$ = await submitEthereum();
			txEvents$.next(broadcasted);
			txEvents$.error(timeout);
			await flush();

			const record = await getRecord();
			expect(record.status).toBe("failed");
			expect(getToastView(record, null)).toEqual({
				outcome: "error",
				text: timeout.message,
			});
		});

		it("cannot confirm a timed out transaction when the chain cannot be read", async () => {
			const txEvents$ = await submitEthereum();
			txEvents$.next(broadcasted);
			chain.isDown = true;
			txEvents$.error(timeout);
			await flush();

			expect((await getRecord()).status).toBe("unknown");
		});

		it("fails a signature the wallet rejected without reading the chain", async () => {
			const txEvents$ = await submitEthereum();
			finalize(101, 2);
			txEvents$.error({ code: 4001, message: "User rejected the request" });

			expect((await getRecord()).status).toBe("failed");
		});
	});
});
