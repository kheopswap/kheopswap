import { renderHook } from "@testing-library/react";
import type { TxEvent } from "polkadot-api";
import { firstValueFrom, Subject } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getToastView } from "../../state/transactions/TransactionToasts";
import {
	dismissTransaction,
	transactions$,
} from "../../state/transactions/transactionStore";
import { useTransactionSubmit } from "./useTransactionSubmit";

vi.mock("../../utils/notifyError", () => ({ notifyError: vi.fn() }));

const ethereum = vi.hoisted(() => ({
	txEvents$: undefined as unknown as Subject<TxEvent>,
}));

vi.mock("./createEthereumTxObservable", () => ({
	createEthereumTxObservable: () => ethereum.txEvents$,
}));

const chain = vi.hoisted(() => ({
	finalizedNonce: 1,
	isDown: false,
	reads: 0,
	readNonce: undefined as (() => Promise<{ nonce: number }>) | undefined,
}));

vi.mock("../../papi/getApi", async () => {
	const { of } = await import("rxjs");
	const api = {
		query: {
			System: {
				Account: {
					getValue: () => {
						chain.reads += 1;
						if (chain.readNonce) return chain.readNonce();
						if (chain.isDown) return Promise.reject(new Error("chain down"));
						return Promise.resolve({ nonce: chain.finalizedNonce });
					},
				},
			},
		},
	};
	return { getApi: async () => api, getApi$: () => of(api) };
});

const polkadotAccount = {
	platform: "polkadot",
	address: "5Signer",
	isPlaceholder: false,
	txCreator: {},
} as never;
const ethereumAccount = {
	platform: "ethereum",
	address: "0xSigner",
	isPlaceholder: false,
	client: {},
} as never;
const feeToken = { id: "native::pasah" } as never;

const created: TxEvent = { type: "created", txHash: "0x01" };
const broadcasted: TxEvent = { type: "broadcasted", txHash: "0x01" };
const notInBestBlock: TxEvent = { type: "notInBestBlock", txHash: "0x01" };
const inBestBlock = {
	type: "inBestBlock",
	txHash: "0x01",
	ok: true,
	events: [],
} as unknown as TxEvent;
const failedInBestBlock = {
	type: "inBestBlock",
	txHash: "0x01",
	ok: false,
	events: [],
	dispatchError: { type: "Token", value: { type: "FundsUnavailable" } },
} as unknown as TxEvent;
const finalized = {
	type: "finalized",
	txHash: "0x01",
	ok: true,
	events: [],
} as unknown as TxEvent;

const TEN_MINUTES = 10 * 60_000;

const renderSubmit = (account = polkadotAccount) => {
	const txEvents$ = new Subject<TxEvent>();
	ethereum.txEvents$ = txEvents$;
	const { onSubmit } = renderHook(() =>
		useTransactionSubmit({
			account,
			signerAddress: "5Signer",
			call: {
				createSubmitAndWatch: () => txEvents$,
				getEncodedData: async () => new Uint8Array([1]),
			} as never,
			chainId: "pasah",
			feeEstimate: 1n,
			feeToken,
			nativeToken: feeToken,
			options: { nonce: 1 },
			isEthereumNetworkMismatch: false,
			targetEvmChainId: undefined,
			transactionType: "transfer",
			transactionTitle: "Transfer",
			followUpData: {},
		}),
	).result.current;
	return { onSubmit, txEvents$ };
};

const getRecord = async () => {
	const [record] = await firstValueFrom(transactions$);
	if (!record) throw new Error("no record");
	return record;
};

const flush = async () => {
	for (let i = 0; i < 5; i++)
		await new Promise<void>((resolve) => setImmediate(resolve));
};

const submitAndBroadcast = async () => {
	const submitted = renderSubmit();
	await submitted.onSubmit();
	submitted.txEvents$.next(created);
	submitted.txEvents$.next(broadcasted);
	return submitted;
};

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	chain.finalizedNonce = 1;
	chain.isDown = false;
	chain.reads = 0;
	chain.readNonce = undefined;
});

afterEach(async () => {
	for (const tx of await firstValueFrom(transactions$))
		dismissTransaction(tx.id);
	vi.useRealTimers();
});

describe("useTransactionSubmit after 10 minutes without a final event", () => {
	it("marks the transaction unconfirmed and still records a later finalization", async () => {
		const { txEvents$ } = await submitAndBroadcast();
		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();

		const unconfirmed = await getRecord();
		expect(unconfirmed.status).toBe("unconfirmed");
		expect(getToastView(unconfirmed, null)).toEqual({
			outcome: "warning",
			text: "Not confirmed after 10 minutes, still watching...",
		});
		txEvents$.next(finalized);
		const record = await getRecord();
		expect(record.status).toBe("finalized");
		expect(getToastView(record, null)).toEqual({
			outcome: "success",
			text: "Finalized",
		});
	});

	it("sends the user to the explorer once the finalized nonce has moved past the submitted one", async () => {
		chain.finalizedNonce = 2;
		await submitAndBroadcast();
		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();

		const record = await getRecord();
		expect(record.status).toBe("lostTrack");
		expect(getToastView(record, null)).toEqual({
			outcome: "warning",
			text: "Could not confirm, check the explorer first",
		});
	});

	it("does not claim inclusion when another transaction with the same nonce landed instead", async () => {
		await submitAndBroadcast();
		const second = renderSubmit();
		await second.onSubmit();
		second.txEvents$.next({ type: "broadcasted", txHash: "0x02" });
		second.txEvents$.next({ ...finalized, txHash: "0x02" } as TxEvent);
		chain.finalizedNonce = 2;
		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();

		const records = await firstValueFrom(transactions$);
		const lost = records.find((record) => record.status === "lostTrack");
		if (!lost) throw new Error("no lostTrack record");
		expect(lost.txEvents).toContainEqual(broadcasted);
		expect(getToastView(lost, null).text).not.toMatch(/includ/i);
	});

	it("stays unconfirmed while the finalized nonce has not moved", async () => {
		await submitAndBroadcast();
		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();
		expect((await getRecord()).status).toBe("unconfirmed");
	});

	it("stays unconfirmed when the chain cannot be read", async () => {
		chain.isDown = true;
		await submitAndBroadcast();
		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();
		expect((await getRecord()).status).toBe("unconfirmed");
	});

	it("keeps waiting for the signature and reads no nonce while the wallet has not signed", async () => {
		chain.finalizedNonce = 2;
		const { onSubmit } = renderSubmit();
		await onSubmit();
		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();
		expect((await getRecord()).status).toBe("pending");
		expect(chain.reads).toBe(0);
	});

	it("counts the 10 minutes from the broadcast, not from the submit click", async () => {
		const { onSubmit, txEvents$ } = renderSubmit();
		await onSubmit();
		txEvents$.next(created);
		vi.advanceTimersByTime(TEN_MINUTES - 60_000);
		txEvents$.next(broadcasted);
		vi.advanceTimersByTime(2 * 60_000);
		await flush();
		expect((await getRecord()).status).toBe("broadcasted");

		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();
		expect((await getRecord()).status).toBe("unconfirmed");
	});

	it("keeps a failure already seen in a best block", async () => {
		chain.finalizedNonce = 2;
		const { txEvents$ } = await submitAndBroadcast();
		txEvents$.next(failedInBestBlock);
		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();
		expect((await getRecord()).status).toBe("failed");
		expect(chain.reads).toBe(0);
	});

	it("keeps a transaction seen in a best block waiting for finalization", async () => {
		const { txEvents$ } = await submitAndBroadcast();
		txEvents$.next(inBestBlock);
		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();
		expect((await getRecord()).status).toBe("inBlock");
	});

	it("restarts the clock when the transaction drops out of a best block", async () => {
		const { txEvents$ } = await submitAndBroadcast();
		txEvents$.next(inBestBlock);
		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();
		txEvents$.next(notInBestBlock);
		vi.advanceTimersByTime(TEN_MINUTES - 1);
		await flush();
		expect((await getRecord()).status).toBe("broadcasted");

		vi.advanceTimersByTime(1);
		await flush();
		expect((await getRecord()).status).toBe("unconfirmed");
	});

	it("gives an Ethereum submission no nonce verdict, since the wallet picked the nonce", async () => {
		chain.finalizedNonce = 2;
		const { onSubmit, txEvents$ } = renderSubmit(ethereumAccount);
		await onSubmit();
		txEvents$.next(broadcasted);
		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();
		expect((await getRecord()).status).toBe("unconfirmed");
		expect(chain.reads).toBe(0);
	});

	it("lets a block seen during the nonce read win over the nonce verdict", async () => {
		let resolveRead = (_value: { nonce: number }) => {};
		chain.readNonce = () =>
			new Promise((resolve) => {
				resolveRead = resolve;
			});
		const { txEvents$ } = await submitAndBroadcast();
		vi.advanceTimersByTime(TEN_MINUTES);
		await flush();
		expect((await getRecord()).status).toBe("unconfirmed");

		txEvents$.next(inBestBlock);
		resolveRead({ nonce: 2 });
		await flush();
		expect((await getRecord()).status).toBe("inBlock");
	});
});
