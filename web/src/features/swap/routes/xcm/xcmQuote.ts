import type { XcmVersionedXcm } from "@polkadot-api/descriptors";
import type { DryRun } from "../../../../hooks/useDryRun";
import type { Api } from "../../../../papi/getApi";
import { getChainById } from "../../../../registry/chains/chains";
import { getTokenId, parseTokenId } from "../../../../registry/tokens/helpers";
import { KNOWN_TOKENS_LIST } from "../../../../registry/tokens/tokens";
import type {
	Token,
	TokenAmount,
	TokenId,
} from "../../../../registry/tokens/types";
import { formatTxError } from "../../../../utils/getErrorMessageFromTxEvents";
import { mergeTokenAmounts } from "../../../../utils/mergeTokenAmounts";
import { plancksToTokens } from "../../../../utils/plancks";
import {
	getXcmDepositMatcher,
	type XcmDepositTarget,
} from "../../../../utils/xcmDeposit";
import type {
	CallSpendings,
	SubmitGate,
} from "../../../transaction/TransactionProvider";
import type {
	XcmDestinationSwapRoute,
	XcmRoute,
	XcmSwapRoute,
	XcmTransferRoute,
} from "../swapRoute";

type XcmOrigin = XcmRoute["origin"];
type XcmDestination = XcmRoute["destination"];

export type OriginDryRun = DryRun<XcmOrigin>;

export type DeliveryFees = {
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
	| { kind: "origin-withdraw-failed" }
	| { kind: "origin-rejected"; xcmError: string }
	| { kind: "message-not-forwarded" }
	| { kind: "destination-unavailable" }
	| {
			kind: "destination-rejected";
			reason: string;
			assetsTrapped: boolean;
			trappedPlancks: bigint | null;
	  }
	| { kind: "destination-price-moved" }
	| { kind: "nothing-deposited" }
	| { kind: "delivery-fee-unavailable" }
	| { kind: "destination-fee-unavailable" }
	| { kind: "fee-estimate-failed"; cause: XcmQuoteFailure }
	| { kind: "below-destination-fee" }
	| { kind: "leftovers-unreceivable" }
	| { kind: "call-unavailable" };

export const getFeeProbePlancks = ({
	existentialDeposit,
	spendable,
	withdrawals,
}: {
	existentialDeposit: bigint | null | undefined;
	spendable: bigint | undefined;
	withdrawals: bigint;
}): bigint | undefined => {
	if (!existentialDeposit) return undefined;
	const share = spendable === undefined ? undefined : spendable / withdrawals;
	const probe =
		share !== undefined && share < existentialDeposit
			? share
			: existentialDeposit;
	return probe > 0n ? probe : 1n;
};

export type XcmQuote = {
	received: bigint;
	destinationFee: TokenAmount;
};

export type XcmQuoteResult =
	| { success: true; quote: XcmQuote }
	| { success: false; failure: XcmQuoteFailure };

type OriginLeg = { message: XcmVersionedXcm; sent: bigint };

export type Parsed<T> =
	| { success: true; value: T }
	| { success: false; failure: XcmQuoteFailure };

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
			return { kind: "origin-withdraw-failed" };
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
			instruction.type === "ReceiveTeleportedAsset" ||
			instruction.type === "WithdrawAsset",
	);
	const [asset] =
		loaded?.type === "ReserveAssetDeposited" ||
		loaded?.type === "ReceiveTeleportedAsset" ||
		loaded?.type === "WithdrawAsset"
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

type DestinationEvent = Extract<
	DestinationDryRun,
	{ success: true }
>["value"]["emitted_events"][number];

const getTrappedPlancks = (events: DestinationEvent[]): bigint | null => {
	for (const event of events)
		if (
			event.type === "PolkadotXcm" &&
			event.value.type === "AssetsTrapped" &&
			event.value.value.assets.type === "V5"
		)
			return event.value.value.assets.value.reduce(
				(sum, { fun }) => sum + (fun.type === "Fungible" ? fun.value : 0n),
				0n,
			);
	return null;
};

export const parseDestinationDryRun = (
	dryRun: DestinationDryRun,
	target: XcmDepositTarget,
): Parsed<bigint> => {
	if (!dryRun.success)
		return { success: false, failure: { kind: "destination-unavailable" } };

	const { execution_result, emitted_events } = dryRun.value;
	if (
		execution_result.type === "Incomplete" &&
		execution_result.value.error.error.type === "NoDeal"
	)
		return { success: false, failure: { kind: "destination-price-moved" } };
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
				trappedPlancks: getTrappedPlancks(emitted_events),
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

export type XcmQuoteSubject =
	| {
			route: XcmTransferRoute | XcmSwapRoute;
			destinationFee?: undefined;
	  }
	| { route: XcmDestinationSwapRoute; destinationFee: TokenAmount };

export const getXcmQuoteSubject = (
	route: XcmRoute,
	destinationFee: TokenAmount | undefined,
): XcmQuoteSubject | null => {
	if (route.kind !== "xcm-destination-swap") return { route };
	return destinationFee ? { route, destinationFee } : null;
};

export const composeXcmQuote = (
	{ route, destinationFee }: XcmQuoteSubject,
	{ sent, received }: { sent: bigint; received: bigint },
): XcmQuote => ({
	received,
	destinationFee: destinationFee ?? {
		tokenId: route.tokenIdOut,
		plancks: sent - received,
	},
});

export type XcmReceived = { plancks: bigint; isEstimate: boolean };

export type XcmDestinationFee = TokenAmount & { isEstimate: boolean };

const takeFee = (
	arriving: bigint | undefined,
	destinationFee: bigint | undefined,
): bigint | undefined =>
	arriving !== undefined &&
	destinationFee !== undefined &&
	arriving > destinationFee
		? arriving - destinationFee
		: undefined;

export const estimateXcmReceived = ({
	kind,
	totalIn,
	pathAmountOut,
	lastDestinationFee,
}: {
	kind: XcmRoute["kind"];
	totalIn: bigint;
	pathAmountOut: bigint | undefined;
	lastDestinationFee: bigint | undefined;
}): bigint | undefined => {
	switch (kind) {
		case "xcm-transfer":
			return takeFee(totalIn, lastDestinationFee);
		case "xcm-swap":
			return takeFee(pathAmountOut, lastDestinationFee ?? 0n);
		case "xcm-destination-swap":
			return pathAmountOut;
	}
};

const ORIGIN_DISPATCH_FAILURES = new Set<XcmQuoteFailure["kind"]>([
	"origin-failed",
	"origin-withdraw-failed",
	"origin-rejected",
]);

export const isOriginDispatchFailure = (failure: XcmQuoteFailure): boolean =>
	failure.kind === "fee-estimate-failed"
		? isOriginDispatchFailure(failure.cause)
		: ORIGIN_DISPATCH_FAILURES.has(failure.kind);

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
		case "origin-withdraw-failed":
			return `${origin} rejected the withdrawal from your account`;
		case "origin-rejected":
			return `${origin} would reject the transfer: ${failure.xcmError}`;
		case "message-not-forwarded":
			return `The transfer would not be sent to ${destination}`;
		case "destination-unavailable":
			return `Could not simulate the transfer on ${destination}`;
		case "destination-price-moved":
			return `The price moved beyond your slippage tolerance on ${destination}`;
		case "destination-rejected":
			return failure.assetsTrapped
				? `Amount too low for ${destination}: the assets would be trapped`
				: `${destination} would reject the transfer: ${failure.reason}`;
		case "nothing-deposited":
			return `${destination} would not credit your account`;
		case "delivery-fee-unavailable":
			return `Could not estimate the ${origin} delivery fee`;
		case "destination-fee-unavailable":
			return `Could not estimate the ${destination} fee`;
		case "fee-estimate-failed":
			return `Could not estimate the ${destination} fee: ${origin} rejected a test withdrawal from your account`;
		case "below-destination-fee":
			return `Amount too low to cover the ${destination} fee`;
		case "leftovers-unreceivable":
			return `Your ${destination} account could not receive the tokens returned if the swap fails`;
		case "call-unavailable":
			return `Could not prepare the transaction on ${origin}`;
	}
};

export const getNewAccountMinimum = ({
	sent,
	trappedPlancks,
	existentialDeposit,
	destinationBalance,
	isSufficient,
}: {
	sent: bigint;
	trappedPlancks: bigint;
	existentialDeposit: bigint;
	destinationBalance: bigint;
	isSufficient: boolean;
}): bigint | null => {
	if (!isSufficient || destinationBalance >= existentialDeposit) return null;
	const keptFee = sent - trappedPlancks;
	const isTrappedBelowDeposit = keptFee > 0n || sent < existentialDeposit;
	return isTrappedBelowDeposit ? existentialDeposit + keptFee : null;
};

const MINIMUM_DISPLAY_DECIMALS = 4;

const formatPlancksUp = (plancks: bigint, decimals: number) => {
	const step = 10n ** BigInt(Math.max(decimals - MINIMUM_DISPLAY_DECIMALS, 0));
	return plancksToTokens(((plancks + step - 1n) / step) * step, decimals);
};

export const describeNewAccountMinimum = ({
	minimum,
	existentialDeposit,
	token,
	destination,
}: {
	minimum: bigint;
	existentialDeposit: bigint;
	token: Pick<Token, "symbol" | "decimals">;
	destination: XcmDestination;
}): string =>
	`Send at least ${formatPlancksUp(minimum, token.decimals)} ${token.symbol}: ${
		getChainById(destination).name
	} needs ${formatPlancksUp(existentialDeposit, token.decimals)} ${token.symbol} to open your account`;

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

const isRelayTokenOnHydration = (token: Token) =>
	token.type === "hydration-asset" &&
	token.location?.parents === 1 &&
	token.location.interior.type === "Here";

const HYDRATION_RELAY_TOKEN_ID = KNOWN_TOKENS_LIST.find(
	isRelayTokenOnHydration,
)?.id;

export const getDeliveryFeeTokenId = (origin: XcmOrigin): TokenId => {
	switch (origin) {
		case "pah":
		case "kah":
		case "wah":
		case "pasah":
		case "ppeople":
		case "kpeople":
		case "wpeople":
			return getTokenId({ type: "native", chainId: origin });
		case "hydration":
			if (!HYDRATION_RELAY_TOKEN_ID)
				throw new Error("Hydration has no relay token");
			return HYDRATION_RELAY_TOKEN_ID;
	}
};

export const getTotalDebited = (
	spendings: CallSpendings,
	transactionFee: TokenAmount | undefined,
): TokenAmount[] =>
	mergeTokenAmounts([
		...Object.entries(spendings).flatMap(([tokenId, spent]) =>
			spent ? [{ tokenId, plancks: spent.plancks }] : [],
		),
		...(transactionFee ? [transactionFee] : []),
	]);

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
