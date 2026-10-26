import { firstValueFrom } from "rxjs";
import { afterEach, describe, expect, it } from "vitest";
import {
	addTransaction,
	dismissTransaction,
	transactions$,
} from "./transactionStore";
import type {
	FollowUpTxEvent,
	TransactionRecord,
	TransactionStatus,
} from "./types";

const record = (
	id: string,
	createdAt: number,
	status: TransactionStatus,
	txEvent: FollowUpTxEvent,
) =>
	({
		id,
		createdAt,
		status,
		txEvents: [{ type: "pending" }, txEvent],
	}) as unknown as TransactionRecord;

const finalized = { type: "finalized", ok: true } as FollowUpTxEvent;

afterEach(async () => {
	for (const tx of await firstValueFrom(transactions$))
		dismissTransaction(tx.id);
});

describe("transaction history pruning", () => {
	it("drops the oldest settled transactions but keeps the ones awaiting a manual dismissal", async () => {
		addTransaction(record("unknown", 0, "unknown", { type: "unknown" }));
		addTransaction(record("expired", 1, "expired", { type: "expired" }));
		addTransaction(record("lostTrack", 2, "lostTrack", { type: "lostTrack" }));
		for (let i = 0; i < 20; i++)
			addTransaction(record(`finalized-${i}`, 10 + i, "finalized", finalized));

		const ids = (await firstValueFrom(transactions$)).map(({ id }) => id);
		expect(ids).toHaveLength(20);
		expect(ids).toEqual(
			expect.arrayContaining(["unknown", "expired", "lostTrack"]),
		);
		expect(ids).not.toContain("finalized-0");
	});
});
