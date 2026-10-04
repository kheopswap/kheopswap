import type { XcmVersionedXcm } from "@polkadot-api/descriptors";
import type { DryRun } from "../../../../hooks/useDryRun";
import type { Api } from "../../../../papi/getApi";
import { getChainById } from "../../../../registry/chains/chains";
import { getTokenId, parseTokenId } from "../../../../registry/tokens/helpers";
import type { TokenAmount, TokenId } from "../../../../registry/tokens/types";
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

type XcmOrigin = XcmRoute["origin"];
type XcmDestination = XcmRoute["destination"];

export type OriginDryRun = DryRun<XcmOrigin>;

type DeliveryFees = {
	[Id in XcmOrigin]: Awaited<
		ReturnType<Api<Id>["apis"]["XcmPaymentApi"]["query_delivery_fees"]>
	>;
}[XcmOrigin];

export type DestinationDryRun = {
	[Id in XcmDestination]: Awaited<
		ReturnType<Api<Id>["apis"]["DryRunApi"]["dry_run_xcm"]>
	>;
}[XcmDestination];

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
	const loaded = message.value.find(
		(instruction) =>
			instruction.type === "ReserveAssetDeposited" ||
			instruction.type === "WithdrawAsset",
	);
	const [asset] =
		loaded?.type === "ReserveAssetDeposited" || loaded?.type === "WithdrawAsset"
			? loaded.value
			: [];
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

const HYDRATION_DOT_ASSET_ID = 5;

export const getDeliveryFeeTokenId = (origin: XcmOrigin): TokenId => {
	switch (origin) {
		case "pah":
			return getTokenId({ type: "native", chainId: origin });
		case "hydration":
			return getTokenId({
				type: "hydration-asset",
				chainId: origin,
				assetId: HYDRATION_DOT_ASSET_ID,
			});
	}
};

export const getXcmFeeParts = (
	deliveryFee: TokenAmount | undefined,
	quote: XcmQuote | undefined,
	tokenIdOut: TokenId,
): TokenAmount[] =>
	[
		deliveryFee,
		quote && { tokenId: tokenIdOut, plancks: quote.destinationFee },
	].filter((part): part is TokenAmount => !!part?.plancks);

export const getXcmCallSpendings = ({
	tokenIdIn,
	totalIn,
	deliveryFee,
}: {
	tokenIdIn: TokenId;
	totalIn: bigint | null | undefined;
	deliveryFee: TokenAmount | undefined;
}): CallSpendings => {
	const spendings: CallSpendings = {};
	const spend = (tokenId: TokenId, plancks: bigint, allowDeath: boolean) => {
		if (!plancks) return;
		const spent = spendings[tokenId];
		spendings[tokenId] = spent
			? {
					plancks: spent.plancks + plancks,
					allowDeath: spent.allowDeath && allowDeath,
				}
			: { plancks, allowDeath };
	};

	spend(tokenIdIn, totalIn ?? 0n, parseTokenId(tokenIdIn).type !== "native");
	if (deliveryFee) spend(deliveryFee.tokenId, deliveryFee.plancks, false);
	return spendings;
};
