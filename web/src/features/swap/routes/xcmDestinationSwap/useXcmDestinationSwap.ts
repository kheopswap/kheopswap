import {
	XcmVersionedAssetId,
	type XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import { useDryRun } from "../../../../hooks/useDryRun";
import { getApi } from "../../../../papi/getApi";
import { getChainById } from "../../../../registry/chains/chains";
import { getTokenId } from "../../../../registry/tokens/helpers";
import type { TokenAmount, TokenId } from "../../../../registry/tokens/types";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import type { AnyTransaction } from "../../../../types/transactions";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import type { XcmDestinationSwapRoute } from "../swapRoute";
import { type AmmPathQuoteState, useAmmPathQuote } from "../useAmmPathQuote";
import {
	describeXcmQuoteFailure,
	type Parsed,
	parseOriginDryRun,
} from "../xcm/xcmQuote";
import {
	type DestinationSwapFee,
	getDestinationSwapPlancksIn,
	getFeeSwap,
} from "./destinationSwapFee";
import { useCanReceiveSwapLeftovers } from "./useCanReceiveSwapLeftovers";

const queryDestinationSwapFee = async (
	route: XcmDestinationSwapRoute,
	message: XcmVersionedXcm,
): Promise<DestinationSwapFee | null> => {
	const api = await getApi(route.destination);
	const weight = await api.apis.XcmPaymentApi.query_xcm_weight(message, {
		at: "best",
	});
	if (!weight.success) return null;
	const getFee = async (tokenId: TokenId) => {
		const fee = await api.apis.XcmPaymentApi.query_weight_to_asset_fee(
			weight.value,
			XcmVersionedAssetId.V5(getXcmV5MultilocationFromTokenId(tokenId)),
			{ at: "best" },
		);
		return fee.success ? fee.value : null;
	};
	const [plancks, nativePlancks] = await Promise.all([
		getFee(route.path[0].tokenIdIn),
		getFee(getTokenId({ type: "native", chainId: route.destination })),
	]);
	return plancks === null || nativePlancks === null
		? null
		: { plancks, nativePlancks };
};

const useDestinationSwapFee = ({
	route,
	beneficiary,
	fakeCall,
}: {
	route: XcmDestinationSwapRoute | null;
	beneficiary: SS58String | null;
	fakeCall: AnyTransaction | null | undefined;
}): { isLoading: boolean; data: Parsed<DestinationSwapFee> | undefined } => {
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

	const fee = useQuery({
		queryKey: [
			"xcmDestinationSwapFee",
			route?.destination,
			route?.path[0].tokenIdIn,
			safeQueryKeyPart(message),
		],
		enabled: !!route && !!message,
		queryFn: () =>
			route && message ? queryDestinationSwapFee(route, message) : null,
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
	});

	const data = useMemo((): Parsed<DestinationSwapFee> | undefined => {
		if (estimate.error)
			return { success: false, failure: { kind: "origin-unavailable" } };
		if (!estimateLeg?.success) return estimateLeg;
		if (fee.error || fee.data === null)
			return {
				success: false,
				failure: { kind: "destination-fee-unavailable" },
			};
		return fee.data && { success: true, value: fee.data };
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
	const fee = useDestinationSwapFee({ route, beneficiary, fakeCall });
	const feeValue = fee.data?.success ? fee.data.value : undefined;

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
		totalIn: swapPlancksIn,
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
		if (fee.data && !fee.data.success)
			return describeXcmQuoteFailure(fee.data.failure, route);
		if (plancksIn && !plancksIn.success)
			return describeXcmQuoteFailure(plancksIn.failure, route);
		if (pathQuote.errorMessage) return pathQuote.errorMessage;
		if (leftovers.canReceive === false)
			return describeXcmQuoteFailure({ kind: "leftovers-unreceivable" }, route);
		return null;
	}, [
		route,
		fee.data,
		plancksIn,
		pathQuote.errorMessage,
		leftovers.canReceive,
	]);

	return {
		fee: feeAmount,
		pathQuote,
		errorMessage,
		isLoading:
			!!route && (fee.isLoading || pathQuote.isLoading || leftovers.isLoading),
	};
};
