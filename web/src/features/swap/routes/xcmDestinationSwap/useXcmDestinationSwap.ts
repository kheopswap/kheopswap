import {
	XcmVersionedAssetId,
	type XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import { useEffect, useMemo, useRef } from "react";
import { useBalance } from "../../../../hooks/useBalance";
import { useDryRun } from "../../../../hooks/useDryRun";
import { usePoolReservesByTokenIds } from "../../../../hooks/usePoolReservesByTokenIds";
import { getApi } from "../../../../papi/getApi";
import { getChainById } from "../../../../registry/chains/chains";
import { getTokenId } from "../../../../registry/tokens/helpers";
import type { TokenAmount } from "../../../../registry/tokens/types";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import { useRelayChains } from "../../../../state/relay";
import type { AnyTransaction } from "../../../../types/transactions";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import { useAssetConvertionLPFee } from "../../useAssetConvertionLPFee";
import type { XcmDestinationSwapRoute } from "../swapRoute";
import { type AmmPathQuoteState, useAmmPathQuote } from "../useAmmPathQuote";
import {
	describeXcmQuoteFailure,
	type Parsed,
	parseOriginDryRun,
} from "../xcm/xcmQuote";
import {
	type DestinationSwapFee,
	getDestinationSwapFee,
	getDestinationSwapPlancksIn,
	getFeeSwap,
} from "./destinationSwapFee";
import { useCanReceiveSwapLeftovers } from "./useCanReceiveSwapLeftovers";

const queryDestinationNativeFee = async (
	route: XcmDestinationSwapRoute,
	message: XcmVersionedXcm,
): Promise<bigint | null> => {
	const api = await getApi(route.destination);
	const weight = await api.apis.XcmPaymentApi.query_xcm_weight(message, {
		at: "best",
	});
	if (!weight.success) return null;
	const fee = await api.apis.XcmPaymentApi.query_weight_to_asset_fee(
		weight.value,
		XcmVersionedAssetId.V5(
			getXcmV5MultilocationFromTokenId(
				getTokenId({ type: "native", chainId: route.destination }),
			),
		),
		{ at: "best" },
	);
	return fee.success ? fee.value : null;
};

const useDestinationNativeFee = ({
	route,
	beneficiary,
	fakeCall,
}: {
	route: XcmDestinationSwapRoute | null;
	beneficiary: SS58String | null;
	fakeCall: AnyTransaction | null | undefined;
}): { isLoading: boolean; data: Parsed<bigint> | undefined } => {
	const estimate = useDryRun({
		chainId: route?.origin,
		from: beneficiary,
		call: fakeCall,
	});
	const estimateLeg = useMemo(
		() =>
			route && estimate.data
				? parseOriginDryRun(
						estimate.data,
						getChainById(route.destination).paraId,
					)
				: undefined,
		[route, estimate.data],
	);
	const message = estimateLeg?.success ? estimateLeg.value.message : null;

	const { data: balanceIn } = useBalance({
		address: beneficiary,
		tokenId: route?.tokenIdIn,
	});
	const isEstimateFailed = !!estimate.error || estimateLeg?.success === false;
	const { refetch: refetchEstimate } = estimate;
	const estimatedBalanceIn = useRef(balanceIn);
	useEffect(() => {
		if (estimatedBalanceIn.current === balanceIn) return;
		estimatedBalanceIn.current = balanceIn;
		if (isEstimateFailed) refetchEstimate();
	}, [balanceIn, isEstimateFailed, refetchEstimate]);

	const fee = useQuery({
		queryKey: [
			"xcmDestinationNativeFee",
			route?.destination,
			safeQueryKeyPart(message),
		],
		enabled: !!route && !!message,
		queryFn: () =>
			route && message ? queryDestinationNativeFee(route, message) : null,
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
	});

	const data = useMemo((): Parsed<bigint> | undefined => {
		if (estimate.error)
			return { success: false, failure: { kind: "origin-unavailable" } };
		if (!estimateLeg?.success) return estimateLeg;
		if (fee.error || fee.data === null)
			return {
				success: false,
				failure: { kind: "destination-fee-unavailable" },
			};
		return fee.data === undefined
			? undefined
			: { success: true, value: fee.data };
	}, [estimate.error, estimateLeg, fee.error, fee.data]);

	return { isLoading: estimate.isLoading || fee.isLoading, data };
};

export type XcmDestinationSwapState = {
	fee: TokenAmount | undefined;
	pathQuote: AmmPathQuoteState;
	errorMessage: string | null;
	isLoading: boolean;
};

export const useXcmDestinationSwap = ({
	route,
	beneficiary,
	totalIn,
	fakeCall,
	slippage,
}: {
	route: XcmDestinationSwapRoute | null;
	beneficiary: SS58String | null;
	totalIn: bigint | null | undefined;
	fakeCall: AnyTransaction | null | undefined;
	slippage: number;
}): XcmDestinationSwapState => {
	const nativeFee = useDestinationNativeFee({ route, beneficiary, fakeCall });
	const { assetHub } = useRelayChains();
	const { data: lpFee } = useAssetConvertionLPFee({ chain: assetHub });
	const firstPool = usePoolReservesByTokenIds({
		tokenId1: route?.path[0].tokenIdIn,
		tokenId2: route?.path[0].tokenIdOut,
	});
	const fee = useMemo((): Parsed<DestinationSwapFee> | undefined => {
		if (!route || !nativeFee.data) return undefined;
		if (!nativeFee.data.success) return nativeFee.data;
		if (lpFee === undefined || !firstPool.data) return undefined;
		const [reserveIn, reserveOut] = firstPool.data;
		const value = getDestinationSwapFee(
			{ ...route.path[0], reserveIn, reserveOut },
			lpFee,
			nativeFee.data.value,
		);
		return value
			? { success: true, value }
			: { success: false, failure: { kind: "destination-fee-unavailable" } };
	}, [route, nativeFee.data, lpFee, firstPool.data]);
	const feeValue = fee?.success ? fee.value : undefined;

	const plancksIn = useMemo(
		() =>
			feeValue && totalIn
				? getDestinationSwapPlancksIn(totalIn, feeValue)
				: undefined,
		[feeValue, totalIn],
	);
	const firstPoolSwap = useMemo(
		() => (route && feeValue ? getFeeSwap(route.path, feeValue) : null),
		[route, feeValue],
	);
	const swapPlancksIn = plancksIn?.success ? plancksIn.value : null;
	const pathQuote = useAmmPathQuote({
		path: route?.path ?? null,
		plancksIn: swapPlancksIn,
		slippage,
		firstPoolSwap,
	});
	const leftovers = useCanReceiveSwapLeftovers({
		route,
		beneficiary,
		pathQuote: pathQuote.quote,
	});

	const feeAmount = useMemo(
		() =>
			route && feeValue
				? { tokenId: route.path[0].tokenIdIn, plancks: feeValue.plancks }
				: undefined,
		[route, feeValue],
	);

	const errorMessage = useMemo(() => {
		if (!route) return null;
		if (fee && !fee.success) return describeXcmQuoteFailure(fee.failure, route);
		if (plancksIn && !plancksIn.success)
			return describeXcmQuoteFailure(plancksIn.failure, route);
		if (pathQuote.errorMessage) return pathQuote.errorMessage;
		if (leftovers.canReceive === false)
			return describeXcmQuoteFailure({ kind: "leftovers-unreceivable" }, route);
		return null;
	}, [route, fee, plancksIn, pathQuote.errorMessage, leftovers.canReceive]);

	return {
		fee: feeAmount,
		pathQuote,
		errorMessage,
		isLoading:
			!!route &&
			(nativeFee.isLoading || pathQuote.isLoading || leftovers.isLoading),
	};
};
