import type { XcmVersionedXcm } from "@polkadot-api/descriptors";
import { AccountId, Binary, type SS58String } from "polkadot-api";
import type { DryRun } from "../../../../hooks/useDryRun";
import type { Api } from "../../../../papi/getApi";
import type { ChainIdHydration } from "../../../../registry/chains/types";
import type { TokenId } from "../../../../registry/tokens/types";
import { formatTxError } from "../../../../utils/getErrorMessageFromTxEvents";
import type { CallSpendings } from "../../../transaction/TransactionProvider";
import type { XcmTransferRoute } from "../swapRoute";

export type OriginDryRun = DryRun<XcmTransferRoute["origin"]>;

export type DestinationDryRun = Awaited<
	ReturnType<Api<ChainIdHydration>["apis"]["DryRunApi"]["dry_run_xcm"]>
>;

export type XcmQuoteFailure =
	| { kind: "origin-failed"; reason: string }
	| { kind: "message-not-forwarded" }
	| { kind: "destination-unavailable" }
	| { kind: "destination-rejected"; reason: string; assetsTrapped: boolean }
	| { kind: "nothing-deposited" };

export type XcmQuote = {
	received: bigint;
	deliveryFee: bigint;
	destinationFee: bigint;
};

export type XcmQuoteResult =
	| { success: true; quote: XcmQuote }
	| { success: false; failure: XcmQuoteFailure };

export type OriginLeg = { message: XcmVersionedXcm; deliveryFee: bigint };

type Parsed<T> =
	| { success: true; value: T }
	| { success: false; failure: XcmQuoteFailure };

const INSUFFICIENT_BALANCE =
	"Insufficient balance to cover the transfer and its fees";

const getOriginFailureReason = (error: unknown): string => {
	const failure = error as {
		type?: string;
		value?: {
			type?: string;
			value?: { type?: string; value?: { error?: { type?: string } } };
		};
	};
	if (
		failure.type !== "Module" ||
		failure.value?.type !== "PolkadotXcm" ||
		failure.value.value?.type !== "LocalExecutionIncompleteWithError"
	)
		return formatTxError(error);

	const xcmError = failure.value.value.value?.error?.type;
	return xcmError === "FailedToTransactAsset"
		? INSUFFICIENT_BALANCE
		: `Asset Hub would reject the transfer: ${xcmError}`;
};

export const parseOriginDryRun = (
	dryRun: OriginDryRun,
	destinationParaId: number,
): Parsed<OriginLeg> => {
	if (!dryRun.success)
		return {
			success: false,
			failure: { kind: "origin-failed", reason: formatTxError(dryRun.value) },
		};

	const { execution_result, emitted_events, forwarded_xcms } = dryRun.value;
	if (!execution_result.success)
		return {
			success: false,
			failure: {
				kind: "origin-failed",
				reason: getOriginFailureReason(execution_result.value.error),
			},
		};

	const message = forwarded_xcms.find(
		([location]) =>
			location.type === "V5" &&
			location.value.parents === 1 &&
			location.value.interior.type === "X1" &&
			location.value.interior.value.type === "Parachain" &&
			location.value.interior.value.value === destinationParaId,
	)?.[1][0];
	if (!message)
		return { success: false, failure: { kind: "message-not-forwarded" } };

	let deliveryFee = 0n;
	for (const event of emitted_events)
		if (event.type === "PolkadotXcm" && event.value.type === "FeesPaid")
			for (const { id, fun } of event.value.value.fees)
				if (
					id.parents === 1 &&
					id.interior.type === "Here" &&
					fun.type === "Fungible"
				)
					deliveryFee += fun.value;

	return { success: true, value: { message, deliveryFee } };
};

const toPublicKey = (address: SS58String) =>
	Binary.toHex(AccountId().enc(address));

export const parseDestinationDryRun = (
	dryRun: DestinationDryRun,
	{ assetId, beneficiary }: { assetId: number; beneficiary: SS58String },
): Parsed<bigint> => {
	if (!dryRun.success)
		return { success: false, failure: { kind: "destination-unavailable" } };

	const { execution_result, emitted_events } = dryRun.value;
	if (execution_result.type !== "Complete")
		return {
			success: false,
			failure: {
				kind: "destination-rejected",
				reason:
					execution_result.type === "Incomplete"
						? execution_result.value.error.error.type
						: execution_result.value.error.type,
				assetsTrapped: emitted_events.some(
					(event) =>
						event.type === "PolkadotXcm" &&
						event.value.type === "AssetsTrapped",
				),
			},
		};

	const beneficiaryKey = toPublicKey(beneficiary);
	let received = 0n;
	for (const event of emitted_events)
		if (
			event.type === "Tokens" &&
			event.value.type === "Deposited" &&
			event.value.value.currency_id === assetId &&
			toPublicKey(event.value.value.who) === beneficiaryKey
		)
			received += event.value.value.amount;

	return received
		? { success: true, value: received }
		: { success: false, failure: { kind: "nothing-deposited" } };
};

export const composeXcmQuote = (
	sent: bigint,
	deliveryFee: bigint,
	received: bigint,
): XcmQuote => ({ received, deliveryFee, destinationFee: sent - received });

export const describeXcmQuoteFailure = (failure: XcmQuoteFailure): string => {
	switch (failure.kind) {
		case "origin-failed":
			return failure.reason;
		case "message-not-forwarded":
			return "The transfer would not be sent to Hydration";
		case "destination-unavailable":
			return "Could not simulate the transfer on Hydration";
		case "destination-rejected":
			return failure.assetsTrapped
				? "Amount too low for Hydration: the assets would be trapped"
				: `Hydration would reject the transfer: ${failure.reason}`;
		case "nothing-deposited":
			return "Hydration would not credit your account";
	}
};

export const getXcmCallSpendings = ({
	tokenIdIn,
	nativeTokenId,
	totalIn,
	deliveryFee,
}: {
	tokenIdIn: TokenId;
	nativeTokenId: TokenId;
	totalIn: bigint | null | undefined;
	deliveryFee: bigint | undefined;
}): CallSpendings => {
	if (tokenIdIn === nativeTokenId)
		return totalIn || deliveryFee
			? {
					[nativeTokenId]: {
						plancks: (totalIn ?? 0n) + (deliveryFee ?? 0n),
						allowDeath: false,
					},
				}
			: {};

	return {
		...(totalIn ? { [tokenIdIn]: { plancks: totalIn, allowDeath: true } } : {}),
		...(deliveryFee
			? { [nativeTokenId]: { plancks: deliveryFee, allowDeath: false } }
			: {}),
	};
};
