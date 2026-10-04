import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import type { WalletAccount } from "../../../../common/kheopskit";
import { useToken } from "../../../../hooks/useToken";
import { getChainById } from "../../../../registry/chains/chains";
import type { Token } from "../../../../registry/tokens/types";
import type { XcmV5Multilocation } from "../../../../registry/types/xcm";
import type { XcmTransferFollowUpData } from "../../../../state/transactions/xcmArrival";
import { isBigInt } from "../../../../utils/isBigInt";
import { plancksToTokens } from "../../../../utils/plancks";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import {
	getRouteAccess,
	type TransactionPlan,
	type XcmRoute,
	type XcmSwapRoute,
	type XcmTransferRoute,
} from "../swapRoute";
import {
	type AmmPath,
	type AmmPathQuote,
	getLastHop,
	mapHopPath,
} from "../xcmSwap/ammPath";
import {
	getXcmSwapCall,
	type XcmSwapCallInputs,
} from "../xcmSwap/getXcmSwapCall";
import { useAmmPathQuote } from "../xcmSwap/useAmmPathQuote";
import { getXcmTransferCall } from "../xcmTransfer/getXcmTransferCall";
import { useXcmQuote, type XcmQuoteState } from "./useXcmQuote";
import {
	describeXcmQuoteFailure,
	getXcmCallSpendings,
	getXcmSubmitGate,
} from "./xcmQuote";

export type XcmTransferDetails = {
	kind: "xcm-transfer";
	route: XcmTransferRoute;
	quote: XcmQuoteState;
};

export type XcmSwapDetails = {
	kind: "xcm-swap";
	route: XcmSwapRoute;
	quote: XcmQuoteState;
	priceImpact: number | undefined;
	slippage: number;
	minReceived: bigint | undefined;
	appCommission: bigint | null | undefined;
};

export type XcmSwapFollowUpData = XcmTransferFollowUpData & {
	swap: {
		path: AmmPath;
		swapPlancksIn: bigint;
		swapPlancksOut: bigint;
		mirrorToken: Token;
	};
};

type XcmCallInputs =
	| { kind: "xcm-transfer"; route: XcmTransferRoute; plancks: bigint }
	| ({ kind: "xcm-swap" } & XcmSwapCallInputs);

type XcmAmounts = {
	totalIn: bigint | null | undefined;
	swapPlancksIn: bigint | null | undefined;
	appCommission: bigint | null | undefined;
	pathQuote: AmmPathQuote | undefined;
	remoteFeeLocation: XcmV5Multilocation | undefined;
};

const getXcmCallInputs = (
	route: XcmRoute,
	{
		totalIn,
		swapPlancksIn,
		appCommission,
		pathQuote,
		remoteFeeLocation,
	}: XcmAmounts,
): XcmCallInputs | null => {
	switch (route.kind) {
		case "xcm-transfer":
			return totalIn ? { kind: route.kind, route, plancks: totalIn } : null;
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
	}
};

// Sized like the AMM fake call, so the fee estimate covers the commission batch.
const getFakeXcmCallInputs = (
	route: XcmRoute,
	edTokenIn: bigint | null | undefined,
	remoteFeeLocation: XcmV5Multilocation | undefined,
): XcmCallInputs | null => {
	if (!edTokenIn) return null;
	switch (route.kind) {
		case "xcm-transfer":
			return { kind: route.kind, route, plancks: edTokenIn };
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
	}
};

const getXcmCall = (inputs: XcmCallInputs, beneficiary: SS58String) => {
	switch (inputs.kind) {
		case "xcm-transfer":
			return getXcmTransferCall({ ...inputs, beneficiary });
		case "xcm-swap":
			return getXcmSwapCall({ ...inputs, beneficiary });
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
			return tokenIn && tokenOut
				? `Swap ${tokenIn.symbol} to ${tokenOut.symbol} on ${destinationName}`
				: "Swap";
	}
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
}: UseXcmRouteProps) => {
	const access = useMemo(
		() => (route && account ? getRouteAccess(account) : null),
		[route, account],
	);
	const beneficiary = access?.allowed ? access.beneficiary : null;

	const swapRoute = route?.kind === "xcm-swap" ? route : null;
	const mirrorTokenId = swapRoute && getLastHop(swapRoute.path).tokenIdOut;
	const { data: mirrorToken } = useToken({ tokenId: mirrorTokenId });
	const pathQuote = useAmmPathQuote({
		path: swapRoute?.path ?? null,
		plancksIn: swapPlancksIn,
		totalIn,
		slippage,
	});

	const remoteFeeLocation =
		tokenOut?.type === "hydration-asset" && tokenOut.id === route?.tokenIdOut
			? tokenOut.location
			: undefined;

	const inputs = useMemo(
		() =>
			route &&
			getXcmCallInputs(route, {
				totalIn,
				swapPlancksIn,
				appCommission,
				pathQuote: pathQuote.quote,
				remoteFeeLocation,
			}),
		[
			route,
			totalIn,
			swapPlancksIn,
			appCommission,
			pathQuote.quote,
			remoteFeeLocation,
		],
	);
	const fakeInputs = useMemo(
		() => route && getFakeXcmCallInputs(route, edTokenIn, remoteFeeLocation),
		[route, edTokenIn, remoteFeeLocation],
	);

	const callQuery = useXcmCall(inputs, beneficiary);
	const { data: fakeCall } = useXcmCall(fakeInputs, beneficiary);
	const call = callQuery.data;

	const quote = useXcmQuote({ route, beneficiary, call, fakeCall });
	const xcmQuote = quote.data?.success ? quote.data.quote : undefined;
	const received = xcmQuote?.received;
	const isLoading =
		quote.isLoading || callQuery.isLoading || pathQuote.isLoading;

	const outputErrorMessage = useMemo(() => {
		if (!route) return null;
		if (access && !access.allowed) return access.reason;
		if (pathQuote.errorMessage) return pathQuote.errorMessage;
		if (callQuery.error)
			return describeXcmQuoteFailure({ kind: "call-unavailable" }, route);
		if (quote.data && !quote.data.success)
			return describeXcmQuoteFailure(quote.data.failure, route);
		return null;
	}, [access, pathQuote.errorMessage, callQuery.error, quote.data, route]);

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
						target: { tokenId: route.tokenIdOut, beneficiary },
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
			transactionType: swapRoute ? "xcmSwap" : "xcmTransfer",
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

	const details = useMemo((): XcmTransferDetails | XcmSwapDetails | null => {
		if (!route) return null;
		switch (route.kind) {
			case "xcm-transfer":
				return { kind: route.kind, route, quote };
			case "xcm-swap": {
				const minReceived =
					pathQuote.quote &&
					xcmQuote &&
					mirrorToken?.decimals === tokenOut?.decimals
						? pathQuote.quote.minOut - xcmQuote.destinationFee
						: undefined;
				return {
					kind: route.kind,
					route,
					quote,
					priceImpact: pathQuote.priceImpact,
					slippage,
					minReceived:
						minReceived && minReceived > 0n ? minReceived : undefined,
					appCommission,
				};
			}
		}
	}, [
		route,
		quote,
		xcmQuote,
		pathQuote.quote,
		pathQuote.priceImpact,
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
		swapPlancksOut: received,
		amountOut:
			received !== undefined && tokenOut
				? plancksToTokens(received, tokenOut.decimals)
				: "",
		isLoadingAmountOut: !!totalIn && isLoading,
	};
};
