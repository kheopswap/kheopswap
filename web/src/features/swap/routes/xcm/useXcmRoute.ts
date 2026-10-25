import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import { useEffect, useMemo, useRef } from "react";
import type { WalletAccount } from "../../../../common/kheopskit";
import { useExistentialDeposit } from "../../../../hooks/useExistentialDeposit";
import { useToken } from "../../../../hooks/useToken";
import { getChainById } from "../../../../registry/chains/chains";
import type { Token } from "../../../../registry/tokens/types";
import type { XcmV5Multilocation } from "../../../../registry/types/xcm";
import type {
	TransactionFollowUp,
	XcmSwapFollowUpData,
	XcmTransferFollowUpData,
} from "../../../../state/transactions/types";
import { isBigInt } from "../../../../utils/isBigInt";
import { plancksToTokens } from "../../../../utils/plancks";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import {
	retryOnceUnlessTimedOut,
	withChainTimeout,
} from "../../../../utils/withTimeout";
import {
	type AmmPathQuote,
	getLastHop,
	getPathTokenIds,
	mapHopPath,
} from "../ammPath";
import {
	getRouteAccess,
	type TransactionPlan,
	type XcmDestinationSwapRoute,
	type XcmRoute,
	type XcmSwapRoute,
	type XcmTransferRoute,
} from "../swapRoute";
import { useAmmPathQuote } from "../useAmmPathQuote";
import {
	getXcmDestinationSwapCall,
	type XcmDestinationSwapCallInputs,
} from "../xcmDestinationSwap/getXcmDestinationSwapCall";
import { useXcmDestinationSwap } from "../xcmDestinationSwap/useXcmDestinationSwap";
import {
	getXcmSwapCall,
	type XcmSwapCallInputs,
} from "../xcmSwap/getXcmSwapCall";
import { getXcmTransferCall } from "../xcmTransfer/getXcmTransferCall";
import { useXcmDryRunBalances } from "./useXcmDryRunBalances";
import { useXcmQuote, type XcmQuoteState } from "./useXcmQuote";
import {
	describeNewAccountMinimum,
	describeXcmQuoteFailure,
	estimateXcmReceived,
	getFeeProbePlancks,
	getNewAccountMinimum,
	getXcmCallSpendings,
	getXcmSubmitGate,
	isOriginDispatchFailure,
	type XcmDestinationFee,
	type XcmQuote,
	type XcmReceived,
} from "./xcmQuote";

export type XcmTransferDetails = {
	kind: "xcm-transfer";
	route: XcmTransferRoute;
	quote: XcmQuoteState;
	received: XcmReceived | undefined;
	destinationFee: XcmDestinationFee | undefined;
};

type XcmPathSwapDetails = {
	quote: XcmQuoteState;
	received: XcmReceived | undefined;
	destinationFee: XcmDestinationFee | undefined;
	pathQuote: AmmPathQuote | undefined;
	priceImpact: number | undefined;
	slippage: number;
	minReceived: bigint | undefined;
};

export type XcmSwapDetails = XcmPathSwapDetails & {
	kind: "xcm-swap";
	route: XcmSwapRoute;
	appCommission: bigint | null | undefined;
};

export type XcmDestinationSwapDetails = XcmPathSwapDetails & {
	kind: "xcm-destination-swap";
	route: XcmDestinationSwapRoute;
};

export type XcmRouteDetails =
	| XcmTransferDetails
	| XcmSwapDetails
	| XcmDestinationSwapDetails;

type XcmCallInputs =
	| {
			kind: "xcm-transfer";
			route: XcmTransferRoute;
			tokenIn: Token;
			plancks: bigint;
	  }
	| ({ kind: "xcm-swap" } & XcmSwapCallInputs)
	| ({ kind: "xcm-destination-swap" } & XcmDestinationSwapCallInputs);

type XcmAmounts = {
	tokenIn: Token | null | undefined;
	totalIn: bigint | null | undefined;
	swapPlancksIn: bigint | null | undefined;
	appCommission: bigint | null | undefined;
	pathQuote: AmmPathQuote | undefined;
	remoteFeeLocation: XcmV5Multilocation | undefined;
};

const getXcmCallInputs = (
	route: XcmRoute,
	{
		tokenIn,
		totalIn,
		swapPlancksIn,
		appCommission,
		pathQuote,
		remoteFeeLocation,
	}: XcmAmounts,
): XcmCallInputs | null => {
	switch (route.kind) {
		case "xcm-transfer":
			return totalIn && tokenIn?.id === route.tokenIdIn
				? { kind: route.kind, route, tokenIn, plancks: totalIn }
				: null;
		case "xcm-swap":
			return swapPlancksIn &&
				isBigInt(appCommission) &&
				pathQuote &&
				remoteFeeLocation
				? {
						kind: route.kind,
						route,
						swapPlancksIn,
						appCommission,
						hops: pathQuote.hops,
						remoteFeeLocation,
					}
				: null;
		case "xcm-destination-swap":
			return totalIn && tokenIn?.id === route.tokenIdIn && pathQuote
				? {
						kind: route.kind,
						route,
						tokenIn,
						plancks: totalIn,
						hops: pathQuote.hops,
					}
				: null;
	}
};

const FAKE_CALL_WITHDRAWALS: Record<XcmRoute["kind"], bigint> = {
	"xcm-transfer": 1n,
	"xcm-swap": 2n,
	"xcm-destination-swap": 1n,
};

// Carries a commission so the fee estimate covers the batch with the service fee transfer.
const getFakeXcmCallInputs = (
	route: XcmRoute,
	tokenIn: Token | null | undefined,
	probePlancks: bigint | undefined,
	remoteFeeLocation: XcmV5Multilocation | undefined,
): XcmCallInputs | null => {
	if (!probePlancks) return null;
	switch (route.kind) {
		case "xcm-transfer":
			return tokenIn?.id === route.tokenIdIn
				? { kind: route.kind, route, tokenIn, plancks: probePlancks }
				: null;
		case "xcm-swap":
			return remoteFeeLocation
				? {
						kind: route.kind,
						route,
						swapPlancksIn: probePlancks,
						appCommission: probePlancks,
						hops: mapHopPath(route.path, (hop) => ({ ...hop, minOut: 0n })),
						remoteFeeLocation,
					}
				: null;
		case "xcm-destination-swap":
			return tokenIn?.id === route.tokenIdIn
				? {
						kind: route.kind,
						route,
						tokenIn,
						plancks: probePlancks,
						hops: mapHopPath(route.path, (hop) => ({ ...hop, minOut: 0n })),
					}
				: null;
	}
};

const getXcmCall = (inputs: XcmCallInputs, beneficiary: SS58String) => {
	switch (inputs.kind) {
		case "xcm-transfer":
			return getXcmTransferCall({ ...inputs, beneficiary });
		case "xcm-swap":
			return getXcmSwapCall({ ...inputs, beneficiary });
		case "xcm-destination-swap":
			return getXcmDestinationSwapCall({ ...inputs, beneficiary });
	}
};

const useXcmCall = (
	inputs: XcmCallInputs | null,
	beneficiary: SS58String | null,
) =>
	useQuery({
		queryKey: ["xcmCall", safeQueryKeyPart(inputs), beneficiary],
		queryFn: ({ signal }) =>
			inputs && beneficiary
				? withChainTimeout(
						inputs.route.origin,
						() => getXcmCall(inputs, beneficiary),
						signal,
					)
				: null,
		retry: retryOnceUnlessTimedOut,
		refetchInterval: false,
		structuralSharing: false,
	});

const getXcmTitle = (
	route: XcmRoute,
	tokenIn: Token | null | undefined,
	tokenOut: Token | null | undefined,
) => {
	const destinationName = getChainById(route.destination).name;
	switch (route.kind) {
		case "xcm-transfer":
			return tokenIn
				? `Transfer ${tokenIn.symbol} to ${destinationName}`
				: "Transfer";
		case "xcm-swap":
		case "xcm-destination-swap":
			return tokenIn && tokenOut
				? `Swap ${tokenIn.symbol} to ${tokenOut.symbol} on ${destinationName}`
				: "Swap";
	}
};

const getReturnTokenIds = (route: XcmRoute) =>
	route.kind === "xcm-destination-swap"
		? getPathTokenIds(route.path)
		: [route.tokenIdOut];

const getXcmFollowUp = (
	route: XcmRoute | null,
	transfer: XcmTransferFollowUpData | null,
	swap: XcmSwapFollowUpData["swap"] | null,
): TransactionFollowUp => {
	if (!route || !transfer) return { type: "unknown" };
	switch (route.kind) {
		case "xcm-transfer":
			return { type: "xcmTransfer", followUpData: transfer };
		case "xcm-destination-swap":
			return { type: "xcmDestinationSwap", followUpData: transfer };
		case "xcm-swap":
			return swap
				? { type: "xcmSwap", followUpData: { ...transfer, swap } }
				: { type: "unknown" };
	}
};

type LastQuote = { pairKey: string; totalIn: bigint; quote: XcmQuote };

const useLastQuote = (
	pairKey: string | null,
	totalIn: bigint | null | undefined,
	quote: XcmQuoteState,
): LastQuote | null => {
	const lastQuote = useRef<LastQuote | null>(null);
	useEffect(() => {
		if (pairKey && totalIn && quote.data?.success)
			lastQuote.current = { pairKey, totalIn, quote: quote.data.quote };
	}, [pairKey, totalIn, quote.data]);
	return pairKey && lastQuote.current?.pairKey === pairKey
		? lastQuote.current
		: null;
};

type UseXcmRouteProps = {
	route: XcmRoute | null;
	account: WalletAccount | null | undefined;
	tokenIn: Token | null | undefined;
	tokenOut: Token | null | undefined;
	totalIn: bigint | null | undefined;
	swapPlancksIn: bigint | null | undefined;
	appCommission: bigint | null | undefined;
	slippage: number;
	edTokenIn: bigint | null | undefined;
	balanceIn: bigint | undefined;
	hasInsufficientBalance: boolean;
	balanceOut: bigint | undefined;
};

export const useXcmRoute = ({
	route,
	account,
	tokenIn,
	tokenOut,
	totalIn,
	swapPlancksIn,
	appCommission,
	slippage,
	edTokenIn,
	balanceIn,
	hasInsufficientBalance,
	balanceOut,
}: UseXcmRouteProps) => {
	const access = useMemo(
		() => (route && account ? getRouteAccess(account, route) : null),
		[route, account],
	);
	const beneficiary = access?.allowed ? access.beneficiary : null;

	const swapRoute = route?.kind === "xcm-swap" ? route : null;
	const mirrorTokenId = swapRoute && getLastHop(swapRoute.path).tokenIdOut;
	const { data: mirrorToken } = useToken({ tokenId: mirrorTokenId });
	const destinationSwapRoute =
		route?.kind === "xcm-destination-swap" ? route : null;

	const remoteFeeLocation =
		tokenOut?.type === "hydration-asset" && tokenOut.id === route?.tokenIdOut
			? tokenOut.location
			: undefined;
	const probePlancks = route
		? getFeeProbePlancks({
				existentialDeposit: edTokenIn,
				spendable: balanceIn,
				withdrawals: FAKE_CALL_WITHDRAWALS[route.kind],
			})
		: undefined;
	const feeProbe = useMemo(
		() =>
			tokenIn && probePlancks
				? { plancks: probePlancks, token: tokenIn }
				: undefined,
		[tokenIn, probePlancks],
	);
	const fakeInputs = useMemo(
		() =>
			route &&
			getFakeXcmCallInputs(route, tokenIn, probePlancks, remoteFeeLocation),
		[route, tokenIn, probePlancks, remoteFeeLocation],
	);
	const { data: fakeCall } = useXcmCall(fakeInputs, beneficiary);
	const dryRunBalances = useXcmDryRunBalances(route, beneficiary);

	const destinationSwap = useXcmDestinationSwap({
		route: destinationSwapRoute,
		beneficiary,
		totalIn,
		fakeCall,
		feeProbe,
		slippage,
		balances: dryRunBalances,
	});
	const swapPathQuote = useAmmPathQuote({
		path: swapRoute?.path ?? null,
		plancksIn: swapPlancksIn,
		slippage,
	});
	const pathQuote = destinationSwapRoute
		? destinationSwap.pathQuote
		: swapPathQuote;

	const inputs = useMemo(
		() =>
			route &&
			getXcmCallInputs(route, {
				tokenIn,
				totalIn,
				swapPlancksIn,
				appCommission,
				pathQuote: pathQuote.quote,
				remoteFeeLocation,
			}),
		[
			route,
			tokenIn,
			totalIn,
			swapPlancksIn,
			appCommission,
			pathQuote.quote,
			remoteFeeLocation,
		],
	);
	const callQuery = useXcmCall(inputs, beneficiary);
	const call = callQuery.data;

	const quote = useXcmQuote({
		route,
		destinationFee: destinationSwap.fee,
		beneficiary,
		call,
		fakeCall,
		balances: dryRunBalances,
	});
	const xcmQuote = quote.data?.success ? quote.data.quote : undefined;
	const isLoading =
		quote.isLoading ||
		callQuery.isLoading ||
		pathQuote.isLoading ||
		destinationSwap.isLoading;

	const lastQuote = useLastQuote(
		route && beneficiary
			? [route.kind, route.tokenIdIn, route.tokenIdOut, beneficiary].join(":")
			: null,
		totalIn,
		quote,
	);
	const replayedQuote =
		isLoading && !quote.data && lastQuote && lastQuote.totalIn === totalIn
			? lastQuote.quote
			: undefined;
	const shownQuote = useMemo(
		(): XcmQuoteState =>
			replayedQuote
				? {
						...quote,
						data: { success: true, quote: replayedQuote },
						isLoading: false,
					}
				: { ...quote, isLoading },
		[quote, replayedQuote, isLoading],
	);
	const originFailure =
		quote.data?.success === false
			? quote.data.failure
			: destinationSwap.feeFailure;
	const isBalanceShortfall =
		hasInsufficientBalance &&
		!!originFailure &&
		isOriginDispatchFailure(originFailure);
	const pathAmountOut =
		route?.kind === "xcm-destination-swap" ||
		(route?.kind === "xcm-swap" && mirrorToken?.decimals === tokenOut?.decimals)
			? pathQuote.quote?.amountOut
			: undefined;
	const shownDestinationFee = shownQuote.data?.success
		? shownQuote.data.quote.destinationFee.plancks
		: lastQuote?.quote.destinationFee.plancks;
	const received = useMemo((): XcmReceived | undefined => {
		if (shownQuote.data?.success)
			return { plancks: shownQuote.data.quote.received, isEstimate: false };
		if (!route || !totalIn || !(isLoading || isBalanceShortfall))
			return undefined;
		const plancks = estimateXcmReceived({
			kind: route.kind,
			totalIn,
			pathAmountOut,
			lastDestinationFee: lastQuote?.quote.destinationFee.plancks,
		});
		return plancks === undefined ? undefined : { plancks, isEstimate: true };
	}, [
		shownQuote.data,
		route,
		totalIn,
		isLoading,
		isBalanceShortfall,
		pathAmountOut,
		lastQuote,
	]);
	const destinationFee = useMemo((): XcmDestinationFee | undefined => {
		if (shownQuote.data?.success)
			return { ...shownQuote.data.quote.destinationFee, isEstimate: false };
		if (received?.isEstimate && lastQuote)
			return { ...lastQuote.quote.destinationFee, isEstimate: true };
		return undefined;
	}, [shownQuote.data, received?.isEstimate, lastQuote]);

	const transferRoute = route?.kind === "xcm-transfer" ? route : null;
	const { data: existentialDepositOut } = useExistentialDeposit({
		tokenId: transferRoute?.tokenIdOut,
	});
	const newAccountMinimumMessage = useMemo(() => {
		const failure = quote.data?.success === false ? quote.data.failure : null;
		if (
			!transferRoute ||
			!tokenOut ||
			failure?.kind !== "destination-rejected" ||
			failure.trappedPlancks === null ||
			quote.sent === undefined ||
			!isBigInt(existentialDepositOut) ||
			balanceOut === undefined
		)
			return null;
		const minimum = getNewAccountMinimum({
			sent: quote.sent,
			trappedPlancks: failure.trappedPlancks,
			existentialDeposit: existentialDepositOut,
			destinationBalance: balanceOut,
			isSufficient: tokenOut.isSufficient,
		});
		return (
			minimum &&
			describeNewAccountMinimum({
				minimum,
				existentialDeposit: existentialDepositOut,
				token: tokenOut,
				destination: transferRoute.destination,
			})
		);
	}, [
		transferRoute,
		tokenOut,
		quote.data,
		quote.sent,
		existentialDepositOut,
		balanceOut,
	]);

	const outputHint =
		route && !account
			? "Connect a Polkadot account to quote cross-chain routes"
			: null;

	const outputErrorMessage = useMemo(() => {
		if (!route || !account) return null;
		if (access && !access.allowed) return access.reason;
		if (callQuery.error)
			return describeXcmQuoteFailure({ kind: "call-unavailable" }, route);
		if (isBalanceShortfall) return null;
		if (destinationSwap.errorMessage) return destinationSwap.errorMessage;
		if (pathQuote.errorMessage) return pathQuote.errorMessage;
		if (newAccountMinimumMessage) return newAccountMinimumMessage;
		if (quote.data && !quote.data.success)
			return describeXcmQuoteFailure(quote.data.failure, route);
		return null;
	}, [
		isBalanceShortfall,
		newAccountMinimumMessage,
		account,
		access,
		callQuery.error,
		destinationSwap.errorMessage,
		pathQuote.errorMessage,
		quote.data,
		route,
	]);

	const submitGate = useMemo(
		() =>
			getXcmSubmitGate({
				errorMessage: outputErrorMessage ?? outputHint,
				isLoading,
				isQuoted: !!xcmQuote,
			}),
		[outputErrorMessage, outputHint, isLoading, xcmQuote],
	);

	const plan = useMemo<TransactionPlan>(() => {
		const transferFollowUpData: XcmTransferFollowUpData | null =
			route && beneficiary && tokenOut
				? {
						origin: route.origin,
						target: { tokenId: route.tokenIdOut, beneficiary },
						returnTokenIds: getReturnTokenIds(route),
						tokenOut,
						estimatedReceived: xcmQuote?.received,
					}
				: null;
		const swapFollowUpData: XcmSwapFollowUpData["swap"] | null =
			swapRoute && swapPlancksIn && pathQuote.quote && mirrorToken
				? {
						path: swapRoute.path,
						swapPlancksIn,
						swapPlancksOut: pathQuote.quote.amountOut,
						mirrorToken,
					}
				: null;

		return {
			chainId: route?.origin,
			call,
			fakeCall,
			callSpendings: route
				? getXcmCallSpendings({
						tokenIdIn: route.tokenIdIn,
						totalIn,
						deliveryFee: quote.deliveryFee,
					})
				: {},
			followUp: getXcmFollowUp(route, transferFollowUpData, swapFollowUpData),
			title: route ? getXcmTitle(route, tokenIn, tokenOut) : "Transfer",
			submitGate,
		};
	}, [
		route,
		swapRoute,
		beneficiary,
		tokenIn,
		tokenOut,
		mirrorToken,
		xcmQuote,
		swapPlancksIn,
		pathQuote.quote,
		call,
		fakeCall,
		totalIn,
		quote.deliveryFee,
		submitGate,
	]);

	const details = useMemo((): XcmRouteDetails | null => {
		if (!route) return null;
		switch (route.kind) {
			case "xcm-transfer":
				return {
					kind: route.kind,
					route,
					quote: shownQuote,
					received,
					destinationFee,
				};
			case "xcm-swap": {
				const minReceived =
					pathQuote.quote &&
					shownDestinationFee !== undefined &&
					mirrorToken?.decimals === tokenOut?.decimals
						? pathQuote.quote.minOut - shownDestinationFee
						: undefined;
				return {
					kind: route.kind,
					route,
					quote: shownQuote,
					received,
					destinationFee,
					pathQuote: pathQuote.quote,
					priceImpact: pathQuote.quote?.priceImpact,
					slippage,
					minReceived:
						minReceived && minReceived > 0n ? minReceived : undefined,
					appCommission,
				};
			}
			case "xcm-destination-swap":
				return {
					kind: route.kind,
					route,
					quote: shownQuote,
					received,
					destinationFee,
					pathQuote: pathQuote.quote,
					priceImpact: pathQuote.quote?.priceImpact,
					slippage,
					minReceived: pathQuote.quote?.minOut,
				};
		}
	}, [
		route,
		shownQuote,
		received,
		destinationFee,
		shownDestinationFee,
		pathQuote.quote,
		mirrorToken?.decimals,
		tokenOut?.decimals,
		slippage,
		appCommission,
	]);

	return {
		quote,
		plan,
		details,
		outputErrorMessage,
		outputHint,
		swapPlancksOut: received?.plancks,
		destinationFee,
		amountOut:
			received && tokenOut
				? plancksToTokens(received.plancks, tokenOut.decimals)
				: "",
		isLoadingAmountOut: !!totalIn && isLoading && !received,
		isLoadingCall: callQuery.isLoading,
	};
};
