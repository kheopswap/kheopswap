import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import { useEffect, useMemo, useRef } from "react";
import type { WalletAccount } from "../../../../common/kheopskit";
import { useExistentialDeposit } from "../../../../hooks/useExistentialDeposit";
import { useToken } from "../../../../hooks/useToken";
import { getChainById } from "../../../../registry/chains/chains";
import type { Token } from "../../../../registry/tokens/types";
import type { XcmV5Multilocation } from "../../../../registry/types/xcm";
import type { XcmTransferFollowUpData } from "../../../../state/transactions/xcmArrival";
import { isBigInt } from "../../../../utils/isBigInt";
import { plancksToTokens } from "../../../../utils/plancks";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import {
	type AmmPath,
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
import { useXcmQuote, type XcmQuoteState } from "./useXcmQuote";
import {
	describeNewAccountMinimum,
	describeXcmQuoteFailure,
	getNewAccountMinimum,
	getXcmCallSpendings,
	getXcmSubmitGate,
	isOriginDispatchFailure,
	type XcmQuoteResult,
} from "./xcmQuote";

export type XcmTransferDetails = {
	kind: "xcm-transfer";
	route: XcmTransferRoute;
	quote: XcmQuoteState;
};

type XcmPathSwapDetails = {
	quote: XcmQuoteState;
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

export type XcmSwapFollowUpData = XcmTransferFollowUpData & {
	swap: {
		path: AmmPath;
		swapPlancksIn: bigint;
		swapPlancksOut: bigint;
		mirrorToken: Token;
	};
};

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

// Sized like the AMM fake call, so the fee estimate covers the commission batch.
const getFakeXcmCallInputs = (
	route: XcmRoute,
	tokenIn: Token | null | undefined,
	edTokenIn: bigint | null | undefined,
	remoteFeeLocation: XcmV5Multilocation | undefined,
): XcmCallInputs | null => {
	if (!edTokenIn) return null;
	switch (route.kind) {
		case "xcm-transfer":
			return tokenIn?.id === route.tokenIdIn
				? { kind: route.kind, route, tokenIn, plancks: edTokenIn }
				: null;
		case "xcm-swap":
			return remoteFeeLocation
				? {
						kind: route.kind,
						route,
						swapPlancksIn: edTokenIn,
						appCommission: edTokenIn,
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
						plancks: edTokenIn,
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
		queryFn: () =>
			inputs && beneficiary ? getXcmCall(inputs, beneficiary) : null,
		retry: 1,
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

const getXcmTransactionType = (
	route: XcmRoute | null,
): TransactionPlan["transactionType"] => {
	switch (route?.kind) {
		case "xcm-swap":
			return "xcmSwap";
		case "xcm-destination-swap":
			return "xcmDestinationSwap";
		case "xcm-transfer":
		case undefined:
			return "xcmTransfer";
	}
};

const useQuoteShownWhileRefreshing = (
	quote: XcmQuoteState,
	isLoading: boolean,
	key: string | null,
): XcmQuoteState => {
	const lastQuote = useRef<{ key: string; data: XcmQuoteResult } | null>(null);
	useEffect(() => {
		if (key && quote.data?.success)
			lastQuote.current = { key, data: quote.data };
	}, [key, quote.data]);

	const shownData =
		isLoading && !quote.data && key && lastQuote.current?.key === key
			? lastQuote.current.data
			: undefined;
	return useMemo(
		() => (shownData ? { ...quote, data: shownData, isLoading: false } : quote),
		[shownData, quote],
	);
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
	const fakeInputs = useMemo(
		() =>
			route &&
			getFakeXcmCallInputs(route, tokenIn, edTokenIn, remoteFeeLocation),
		[route, tokenIn, edTokenIn, remoteFeeLocation],
	);
	const { data: fakeCall } = useXcmCall(fakeInputs, beneficiary);

	const destinationSwap = useXcmDestinationSwap({
		route: destinationSwapRoute,
		beneficiary,
		totalIn,
		fakeCall,
		slippage,
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
	});
	const xcmQuote = quote.data?.success ? quote.data.quote : undefined;
	const received = xcmQuote?.received;
	const isLoading =
		quote.isLoading ||
		callQuery.isLoading ||
		pathQuote.isLoading ||
		destinationSwap.isLoading;

	const shownQuote = useQuoteShownWhileRefreshing(
		quote,
		isLoading,
		route && beneficiary && totalIn
			? [
					route.kind,
					route.tokenIdIn,
					route.tokenIdOut,
					beneficiary,
					totalIn,
				].join(":")
			: null,
	);
	const isBalanceShortfall =
		hasInsufficientBalance &&
		quote.data?.success === false &&
		isOriginDispatchFailure(quote.data.failure);
	const pathEstimate =
		route?.kind === "xcm-destination-swap" ||
		(route?.kind === "xcm-swap" && mirrorToken?.decimals === tokenOut?.decimals)
			? pathQuote.quote?.amountOut
			: undefined;
	const shownReceived = shownQuote.data?.success
		? shownQuote.data.quote.received
		: isBalanceShortfall
			? pathEstimate
			: undefined;

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

	const outputErrorMessage = useMemo(() => {
		if (!route) return null;
		if (!account)
			return "Connect a Polkadot account to quote cross-chain routes";
		if (access && !access.allowed) return access.reason;
		if (callQuery.error)
			return describeXcmQuoteFailure({ kind: "call-unavailable" }, route);
		if (destinationSwap.errorMessage) return destinationSwap.errorMessage;
		if (pathQuote.errorMessage) return pathQuote.errorMessage;
		if (isBalanceShortfall) return null;
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
				errorMessage: outputErrorMessage,
				isLoading,
				isQuoted: !!xcmQuote,
			}),
		[outputErrorMessage, isLoading, xcmQuote],
	);

	const plan = useMemo<TransactionPlan>(() => {
		const transferFollowUpData: XcmTransferFollowUpData | null =
			route && beneficiary && tokenOut
				? {
						origin: route.origin,
						target: { tokenId: route.tokenIdOut, beneficiary },
						returnTokenIds: getReturnTokenIds(route),
						tokenOut,
						estimatedReceived: received,
					}
				: null;
		const followUpData: XcmTransferFollowUpData | XcmSwapFollowUpData | object =
			transferFollowUpData &&
			swapRoute &&
			swapPlancksIn &&
			pathQuote.quote &&
			mirrorToken
				? {
						...transferFollowUpData,
						swap: {
							path: swapRoute.path,
							swapPlancksIn,
							swapPlancksOut: pathQuote.quote.amountOut,
							mirrorToken,
						},
					}
				: (transferFollowUpData ?? {});

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
			followUpData,
			transactionType: getXcmTransactionType(route),
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
		received,
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
				return { kind: route.kind, route, quote: shownQuote };
			case "xcm-swap": {
				const minReceived =
					pathQuote.quote &&
					shownQuote.data?.success &&
					mirrorToken?.decimals === tokenOut?.decimals
						? pathQuote.quote.minOut -
							shownQuote.data.quote.destinationFee.plancks
						: undefined;
				return {
					kind: route.kind,
					route,
					quote: shownQuote,
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
					pathQuote: pathQuote.quote,
					priceImpact: pathQuote.quote?.priceImpact,
					slippage,
					minReceived: pathQuote.quote?.minOut,
				};
		}
	}, [
		route,
		shownQuote,
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
		swapPlancksOut: shownReceived,
		amountOut:
			shownReceived !== undefined && tokenOut
				? plancksToTokens(shownReceived, tokenOut.decimals)
				: "",
		isLoadingAmountOut: !!totalIn && isLoading && shownReceived === undefined,
	};
};
