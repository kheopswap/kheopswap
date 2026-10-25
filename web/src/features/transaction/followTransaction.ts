import type { SS58String, TxEvent } from "polkadot-api";
import {
	catchError,
	filter,
	map,
	type Observable,
	of,
	retry,
	Subscription,
	switchMap,
	take,
	timer,
} from "rxjs";
import { getApi, getApi$ } from "../../papi/getApi";
import type { ChainId } from "../../registry/chains/types";
import {
	appendTxEvent,
	minimizeTransaction,
} from "../../state/transactions/transactionStore";
import type {
	FollowUpTxEvent,
	TransactionId,
} from "../../state/transactions/types";
import { formatTxError } from "../../utils/getErrorMessageFromTxEvents";
import { logger } from "../../utils/logger";

const TX_UNCONFIRMED_MS = 10 * 60 * 1000;
const EXPIRY_WATCH_RETRY_MS = 10_000;

export type Submission = {
	txId: TransactionId;
	chainId: ChainId;
	signer: SS58String;
	nonce: number;
	// first finalized block number a mortal transaction can no longer be included in,
	// null for an Ethereum submission, which has no mortality
	death: number | null;
};

const isUserRejectedTxError = (error: unknown): boolean => {
	if (typeof error !== "object" || error === null) return false;

	if ("code" in error) {
		const code = (error as { code?: unknown }).code;
		if (code === 4001 || code === "ACTION_REJECTED") return true;
	}

	if ("name" in error) {
		const name = (error as { name?: unknown }).name;
		if (typeof name === "string" && name.includes("Rejected")) return true;
	}

	if ("message" in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string") {
			const normalized = message.toLowerCase();
			if (
				normalized.includes("user rejected") ||
				normalized.includes("user denied") ||
				normalized.includes("cancelled") ||
				normalized.includes("canceled")
			) {
				return true;
			}
		}
	}

	return false;
};

const getVerdict = (
	chainNonce: number,
	{ nonce }: Submission,
	notIncluded: FollowUpTxEvent,
): FollowUpTxEvent =>
	chainNonce > nonce ? { type: "lostTrack" } : notIncluded;

const watchExpiry$ = (
	submission: Submission,
	death: number,
): Observable<FollowUpTxEvent> =>
	getApi$(submission.chainId).pipe(
		switchMap((api) =>
			api.query.System.Account.watchValue(submission.signer, {
				at: "finalized",
			}),
		),
		retry({
			delay: (error) => {
				logger.warn("Could not watch the chain for an expiry, retrying", {
					txId: submission.txId,
					error,
				});
				return timer(EXPIRY_WATCH_RETRY_MS);
			},
		}),
		filter(({ block }) => block.number >= death),
		take(1),
		map(({ value }) =>
			getVerdict(value.nonce, submission, { type: "expired" }),
		),
	);

const settleTimeout = async (
	submission: Submission,
): Promise<FollowUpTxEvent> => {
	try {
		const api = await getApi(submission.chainId);
		const { nonce } = await api.query.System.Account.getValue(
			submission.signer,
			{ at: "finalized" },
		);
		return getVerdict(nonce, submission, { type: "unknown" });
	} catch (readError) {
		logger.warn("Could not read the chain for a timed out transaction", {
			txId: submission.txId,
			error: readError,
		});
		return { type: "unknown" };
	}
};

// Not tied to the component lifecycle so transactions survive navigation.
export const followTransaction = (
	submission: Submission,
	txEvents$: Observable<TxEvent>,
	onSigned: () => void,
): void => {
	const { txId } = submission;
	let isSigned = false;
	let isBroadcast = false;
	const clocks = new Subscription();
	const stream = new Subscription();

	const settle = (event: FollowUpTxEvent) => {
		appendTxEvent(txId, event);
		clocks.unsubscribe();
		stream.unsubscribe();
	};

	const startClocks = () => {
		clocks.add(
			timer(TX_UNCONFIRMED_MS).subscribe(() => {
				logger.warn("Transaction not confirmed after 10 minutes", txId);
				appendTxEvent(txId, { type: "unconfirmed" });
			}),
		);
		if (submission.death !== null)
			clocks.add(watchExpiry$(submission, submission.death).subscribe(settle));
	};

	const onError = (error: unknown) => {
		logger.error("Transaction error", error);
		const hasNestedError =
			typeof error === "object" && error !== null && "error" in error;
		if (
			hasNestedError &&
			formatTxError((error as { error: unknown }).error) ===
				"Unknown: CannotLookup"
		)
			console.warn(
				"It could be that the chain doesn't support CheckMetadataHash",
			);

		const isTimeoutAfterBroadcast = isBroadcast && submission.death === null;
		if (isTimeoutAfterBroadcast) {
			clocks.unsubscribe();
			settleTimeout(submission).then(settle);
			return;
		}

		settle({ type: "error", error });
		if (!isSigned && isUserRejectedTxError(error)) minimizeTransaction(txId);
	};

	stream.add(
		txEvents$
			.pipe(catchError((error) => of({ type: "error" as const, error })))
			.subscribe((event) => {
				logger.log("Transaction status update", event);
				if (event.type === "error") return onError(event.error);

				if (!isSigned) {
					isSigned = true;
					onSigned();
					startClocks();
				}
				if (event.type === "broadcasted") isBroadcast = true;

				appendTxEvent(txId, event);
				if (event.type === "inBestBlock") clocks.unsubscribe();
				if (event.type === "finalized") {
					clocks.unsubscribe();
					stream.unsubscribe();
				}
			}),
	);
};
