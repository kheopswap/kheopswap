import { describe, expect, it, vi } from "vitest";
import {
	type BridgeTransferFixture,
	DOT_ON_KAH,
	dotPolkadotToKusama,
	KSM_ON_PAH,
	ksmKusamaToPolkadot,
} from "../../features/swap/routes/xcm/xcmBridge.fixtures";
import type { ChainId } from "../../registry/chains/types";
import type { TokenId } from "../../registry/tokens/types";
import type { TxEvents } from "../../utils/getErrorMessageFromTxEvents";
import type { TransactionRecord } from "./types";
import type { XcmTransferFollowUpData } from "./xcmArrival";

const blocks = await vi.hoisted(async () => {
	const { Subject } = await import("rxjs");
	type Block = { value: { phase: { type: string }; event: unknown }[] };
	return { pah: new Subject<Block>(), kah: new Subject<Block>() };
});

vi.mock("../../papi/getApi", async () => {
	const { of, NEVER } = await import("rxjs");
	return {
		getApi$: (chainId: ChainId) =>
			of({
				query: {
					System: {
						Events: {
							watchValue: () =>
								chainId === "pah" || chainId === "kah"
									? blocks[chainId]
									: NEVER,
						},
					},
				},
			}),
	};
});

const { addTransaction } = await import("./transactionStore");
const { getTrackedXcmArrival, trackXcmArrivals } = await import("./xcmArrival");

const getSent = ({ originDryRun }: BridgeTransferFixture) => {
	if (!originDryRun.success) throw new Error("fixture origin failed");
	const events: TxEvents = originDryRun.value.emitted_events;
	const sent = events.find(({ value }) => value.type === "Sent");
	if (!sent) throw new Error("fixture sent no message");
	return { events, messageId: sent.value.value.message_id as string };
};

const getDeposits = ({ destinationDryRun }: BridgeTransferFixture) => {
	if (!destinationDryRun?.success)
		throw new Error("fixture destination failed");
	return destinationDryRun.value.emitted_events;
};

const bridge = (fixture: BridgeTransferFixture, tokenId: TokenId) => {
	const { origin, destination, beneficiary } = fixture;
	const { events, messageId } = getSent(fixture);
	const followUpData: Partial<XcmTransferFollowUpData> = {
		origin,
		firstHop: destination,
		target: { tokenId, beneficiary },
		returnTokenIds: [tokenId],
	};
	addTransaction({
		id: fixture.sender + tokenId,
		type: "xcmTransfer",
		status: "finalized",
		txEvents: [{ type: "finalized", ok: true, events }],
		followUpData,
	} as unknown as TransactionRecord);

	return {
		messageId,
		getArrival: () => getTrackedXcmArrival(fixture.sender + tokenId),
		arrive: () =>
			blocks[destination].next({
				value: [
					...getDeposits(fixture),
					{
						type: "MessageQueue",
						value: {
							type: "Processed",
							value: {
								id: messageId,
								origin: { type: "Sibling", value: 1002 },
								success: true,
							},
						},
					},
				].map((event) => ({ phase: { type: "Finalization" }, event })),
			}),
	};
};

describe("trackXcmArrivals over the bridge", () => {
	it.each([
		[
			"KSM on Polkadot Asset Hub",
			ksmKusamaToPolkadot,
			KSM_ON_PAH,
			99628419408n,
		],
		["DOT on Kusama Asset Hub", dotPolkadotToKusama, DOT_ON_KAH, 9997354620n],
	])(
		"follows the message its origin sent until %s receives it",
		(_, fixture, tokenId, received) => {
			const subscription = trackXcmArrivals();
			const { messageId, getArrival, arrive } = bridge(fixture, tokenId);

			expect(getArrival()).toEqual({ status: "in-transit", messageId });
			arrive();
			expect(getArrival()).toEqual({ status: "arrived", messageId, received });

			subscription.unsubscribe();
		},
	);
});
