import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import type { WalletAccount } from "../../../../common/kheopskit";
import { getChainById } from "../../../../registry/chains/chains";
import { getTokenId } from "../../../../registry/tokens/helpers";
import type { Token } from "../../../../registry/tokens/types";
import type { XcmTransferFollowUpData } from "../../../../state/transactions/xcmArrival";
import { plancksToTokens } from "../../../../utils/plancks";
import type { SubmitGate } from "../../../transaction/TransactionProvider";
import {
	getRouteAccess,
	type TransactionPlan,
	type XcmTransferRoute,
} from "../swapRoute";
import { getXcmTransferCall } from "../xcmTransfer/getXcmTransferCall";
import { useXcmQuote } from "./useXcmQuote";
import { describeXcmQuoteFailure, getXcmCallSpendings } from "./xcmQuote";

const useXcmTransferCall = ({
	route,
	plancks,
	beneficiary,
}: {
	route: XcmTransferRoute | null;
	plancks: bigint | null | undefined;
	beneficiary: SS58String | null;
}) =>
	useQuery({
		queryKey: [
			"xcmTransferCall",
			route?.tokenIdIn,
			route?.tokenIdOut,
			plancks?.toString(),
			beneficiary,
		],
		queryFn: () =>
			route && plancks && beneficiary
				? getXcmTransferCall({ route, plancks, beneficiary })
				: null,
		refetchInterval: false,
		structuralSharing: false,
	});

type UseXcmTransferProps = {
	route: XcmTransferRoute | null;
	account: WalletAccount | null | undefined;
	tokenIn: Token | null | undefined;
	tokenOut: Token | null | undefined;
	totalIn: bigint | null | undefined;
	edTokenIn: bigint | null | undefined;
};

export const useXcmTransfer = ({
	route,
	account,
	tokenIn,
	tokenOut,
	totalIn,
	edTokenIn,
}: UseXcmTransferProps) => {
	const access = useMemo(
		() => (route && account ? getRouteAccess(account) : null),
		[route, account],
	);
	const beneficiary = access?.allowed ? access.beneficiary : null;

	const { data: call } = useXcmTransferCall({
		route,
		plancks: totalIn,
		beneficiary,
	});
	const { data: fakeCall } = useXcmTransferCall({
		route,
		plancks: edTokenIn,
		beneficiary,
	});

	const quote = useXcmQuote({
		route,
		beneficiary,
		call,
		fakeCall,
	});

	const received = quote.data?.success ? quote.data.quote.received : undefined;

	const outputErrorMessage = useMemo(() => {
		if (access && !access.allowed) return access.reason;
		if (quote.data && !quote.data.success)
			return describeXcmQuoteFailure(quote.data.failure);
		return null;
	}, [access, quote.data]);

	const submitGate = useMemo<SubmitGate>(() => {
		if (outputErrorMessage)
			return { status: "closed", reason: outputErrorMessage };
		if (quote.isLoading) return { status: "pending" };
		if (quote.data?.success) return { status: "open" };
		return { status: "closed", reason: "Nothing to transfer yet" };
	}, [outputErrorMessage, quote.isLoading, quote.data]);

	const plan = useMemo<TransactionPlan>(() => {
		const followUpData: XcmTransferFollowUpData | object =
			route && beneficiary && tokenOut
				? {
						target: {
							destination: route.destination,
							assetId: route.destinationAssetId,
							beneficiary,
						},
						tokenOut,
						estimatedReceived: received,
					}
				: {};

		return {
			chainId: route?.origin,
			call,
			fakeCall,
			callSpendings: route
				? getXcmCallSpendings({
						tokenIdIn: route.tokenIdIn,
						nativeTokenId: getTokenId({
							type: "native",
							chainId: route.origin,
						}),
						totalIn,
						deliveryFee: quote.deliveryFee,
					})
				: {},
			followUpData,
			transactionType: "xcmTransfer",
			title:
				route && tokenIn
					? `Transfer ${tokenIn.symbol} to ${getChainById(route.destination).name}`
					: "Transfer",
			submitGate,
		};
	}, [
		route,
		beneficiary,
		tokenIn,
		tokenOut,
		received,
		call,
		fakeCall,
		totalIn,
		quote.deliveryFee,
		submitGate,
	]);

	return {
		quote,
		plan,
		outputErrorMessage,
		swapPlancksOut: received,
		amountOut:
			received !== undefined && tokenOut
				? plancksToTokens(received, tokenOut.decimals)
				: "",
		isLoadingAmountOut: !!totalIn && quote.isLoading,
	};
};
