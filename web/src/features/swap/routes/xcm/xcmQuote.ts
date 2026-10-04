import type { XcmVersionedXcm } from "@polkadot-api/descriptors";
import type { DryRun } from "../../../../hooks/useDryRun";
import type { Api } from "../../../../papi/getApi";
import { getChainById } from "../../../../registry/chains/chains";
import type { ChainIdHydration } from "../../../../registry/chains/types";
import type { TokenId } from "../../../../registry/tokens/types";
import { formatTxError } from "../../../../utils/getErrorMessageFromTxEvents";
import {
	getXcmDepositMatcher,
	type XcmDepositTarget,
} from "../../../../utils/xcmDeposit";
import type {
	CallSpendings,
	SubmitGate,
} from "../../../transaction/TransactionProvider";
import type { XcmRoute } from "../swapRoute";

export type OriginDryRun = DryRun<XcmRoute["origin"]>;

type DeliveryFees = Awaited<
	ReturnType<
		Api<XcmRoute["origin"]>["apis"]["XcmPaymentApi"]["query_delivery_fees"]
	>
>;

export type DestinationDryRun = Awaited<
	ReturnType<Api<ChainIdHydration>["apis"]["DryRunApi"]["dry_run_xcm"]>
>;

export type XcmQuoteFailure =
	| { kind: "origin-unavailable" }
	| { kind: "origin-failed"; reason: string }
	| { kind: "origin-rejected"; xcmError: string }
	| { kind: "message-not-forwarded" }
	| { kind: "destination-unavailable" }
	| { kind: "destination-rejected"; reason: string; assetsTrapped: boolean }
	| { kind: "nothing-deposited" }
	| { kind: "delivery-fee-unavailable" }
	| { kind: "call-unavailable" };

export type XcmQuote = {
	received: bigint;
	destinationFee: bigint;
};

export type XcmQuoteResult =
	| { success: true; quote: XcmQuote }
	| { success: false; failure: XcmQuoteFailure };

type OriginLeg = { message: XcmVersionedXcm; sent: bigint };

type Parsed<T> =
	| { success: true; value: T }
	| { success: false; failure: XcmQuoteFailure };

const INSUFFICIENT_BALANCE =
	"Insufficient balance to cover the transfer and its fees";

type OriginDispatchError = Extract<
	Extract<OriginDryRun, { success: true }>["value"]["execution_result"],
	{ success: false }
>["value"]["error"];

const getOriginFailure = (error: OriginDispatchError): XcmQuoteFailure => {
	if (
		error.type !== "Module" ||
		error.value.type !== "PolkadotXcm" ||
		error.value.value.type !== "LocalExecutionIncompleteWithError"
	)
		return { kind: "origin-failed", reason: formatTxError(error) };

	const xcmError = error.value.value.value.error.type;
	switch (xcmError) {
		case "FailedToTransactAsset":
			return { kind: "origin-failed", reason: INSUFFICIENT_BALANCE };
		case "NoDeal":
			return {
				kind: "origin-failed",
				reason: "The price moved beyond your slippage tolerance",
			};
		default:
			return { kind: "origin-rejected", xcmError };
	}
};

const getSentAmount = (message: XcmVersionedXcm): bigint | null => {
	if (message.type !== "V5") return null;
	const deposit = message.value.find(
		(instruction) => instruction.type === "ReserveAssetDeposited",
	);
	const [asset] =
		deposit?.type === "ReserveAssetDeposited" ? deposit.value : [];
	return asset?.fun.type === "Fungible" ? asset.fun.value : null;
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

	const { execution_result, forwarded_xcms } = dryRun.value;
	if (!execution_result.success)
		return {
			success: false,
			failure: getOriginFailure(execution_result.value.error),
		};

	const message = forwarded_xcms.find(
		([location]) =>
			location.type === "V5" &&
			location.value.parents === 1 &&
			location.value.interior.type === "X1" &&
			location.value.interior.value.type === "Parachain" &&
			location.value.interior.value.value === destinationParaId,
	)?.[1][0];
	const sent = message && getSentAmount(message);
	if (!message || !sent)
		return { success: false, failure: { kind: "message-not-forwarded" } };

	return { success: true, value: { message, sent } };
};

export const parseDeliveryFee = (deliveryFees: DeliveryFees): bigint | null => {
	if (!deliveryFees.success || deliveryFees.value.type !== "V5") return null;

	let fee = 0n;
	for (const { id, fun } of deliveryFees.value.value) {
		if (
			id.parents !== 1 ||
			id.interior.type !== "Here" ||
			fun.type !== "Fungible"
		)
			return null;
		fee += fun.value;
	}
	return fee;
};

export const parseDestinationDryRun = (
	dryRun: DestinationDryRun,
	target: XcmDepositTarget,
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

	const getDeposit = getXcmDepositMatcher(target);
	const received = emitted_events.reduce(
		(sum, event) => sum + getDeposit(event),
		0n,
	);

	return received
		? { success: true, value: received }
		: { success: false, failure: { kind: "nothing-deposited" } };
};

export const composeXcmQuote = (sent: bigint, received: bigint): XcmQuote => ({
	received,
	destinationFee: sent - received,
});

export const describeXcmQuoteFailure = (
	failure: XcmQuoteFailure,
	route: Pick<XcmRoute, "origin" | "destination">,
): string => {
	const origin = getChainById(route.origin).name;
	const destination = getChainById(route.destination).name;
	switch (failure.kind) {
		case "origin-unavailable":
			return `Could not simulate the transfer on ${origin}`;
		case "origin-failed":
			return failure.reason;
		case "origin-rejected":
			return `${origin} would reject the transfer: ${failure.xcmError}`;
		case "message-not-forwarded":
			return `The transfer would not be sent to ${destination}`;
		case "destination-unavailable":
			return `Could not simulate the transfer on ${destination}`;
		case "destination-rejected":
			return failure.assetsTrapped
				? `Amount too low for ${destination}: the assets would be trapped`
				: `${destination} would reject the transfer: ${failure.reason}`;
		case "nothing-deposited":
			return `${destination} would not credit your account`;
		case "delivery-fee-unavailable":
			return `Could not estimate the ${origin} delivery fee`;
		case "call-unavailable":
			return `Could not prepare the transaction on ${origin}`;
	}
};

export const getXcmSubmitGate = ({
	errorMessage,
	isLoading,
	isQuoted,
}: {
	errorMessage: string | null;
	isLoading: boolean;
	isQuoted: boolean;
}): SubmitGate => {
	if (errorMessage) return { status: "closed", reason: errorMessage };
	if (isLoading) return { status: "pending" };
	if (isQuoted) return { status: "open" };
	return { status: "closed", reason: "Nothing to send yet" };
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
