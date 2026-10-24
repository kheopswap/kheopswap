import {
	XcmV5Junction,
	XcmV5Junctions,
	XcmVersionedAssetId,
	XcmVersionedLocation,
	type XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import { useDryRun } from "../../../../hooks/useDryRun";
import { getApi } from "../../../../papi/getApi";
import { getChainById } from "../../../../registry/chains/chains";
import type { ChainId } from "../../../../registry/chains/types";
import type { TokenAmount } from "../../../../registry/tokens/types";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import type { AnyTransaction } from "../../../../types/transactions";
import { isBigInt } from "../../../../utils/isBigInt";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import type { XcmDestinationSwapRoute, XcmRoute } from "../swapRoute";
import {
	composeXcmQuote,
	getDeliveryFeeTokenId,
	parseDeliveryFee,
	parseDestinationDryRun,
	parseOriginDryRun,
	type XcmQuoteResult,
} from "./xcmQuote";

export type XcmQuoteState = {
	isLoading: boolean;
	data: XcmQuoteResult | undefined;
	deliveryFee: TokenAmount | undefined;
};

const getParachainLocation = (chainId: ChainId) =>
	XcmVersionedLocation.V5({
		parents: 1,
		interior: XcmV5Junctions.X1(
			XcmV5Junction.Parachain(getChainById(chainId).paraId),
		),
	});

const queryDeliveryFees = async (route: XcmRoute, message: XcmVersionedXcm) => {
	const destination = getParachainLocation(route.destination);
	switch (route.origin) {
		case "pah":
		case "kah":
		case "wah":
		case "pasah":
		case "ppeople":
		case "kpeople":
		case "wpeople": {
			const api = await getApi(route.origin);
			return api.apis.XcmPaymentApi.query_delivery_fees(
				destination,
				message,
				XcmVersionedAssetId.V5({ parents: 1, interior: XcmV5Junctions.Here() }),
				{ at: "best" },
			);
		}
		case "hydration": {
			const api = await getApi(route.origin);
			return api.apis.XcmPaymentApi.query_delivery_fees(destination, message, {
				at: "best",
			});
		}
	}
};

const queryDestinationDryRun = async (
	route: XcmRoute,
	message: XcmVersionedXcm,
) => {
	const origin = getParachainLocation(route.origin);
	const api = await getApi(route.destination);
	return api.apis.DryRunApi.dry_run_xcm(origin, message, { at: "best" });
};

const queryDestinationSwapFee = async (
	route: XcmDestinationSwapRoute,
	message: XcmVersionedXcm,
) => {
	const api = await getApi(route.destination);
	const weight = await api.apis.XcmPaymentApi.query_xcm_weight(message, {
		at: "best",
	});
	if (!weight.success) return null;
	const fee = await api.apis.XcmPaymentApi.query_weight_to_asset_fee(
		weight.value,
		XcmVersionedAssetId.V5(
			getXcmV5MultilocationFromTokenId(route.path[0].tokenIdIn),
		),
		{ at: "best" },
	);
	return fee.success ? fee.value : null;
};

export const useDestinationSwapFee = (
	route: XcmRoute | null,
	message: XcmVersionedXcm | null,
) => {
	const destinationSwapRoute =
		route?.kind === "xcm-destination-swap" ? route : null;
	return useQuery({
		queryKey: [
			"xcmDestinationSwapFee",
			destinationSwapRoute?.path[0].tokenIdIn,
			safeQueryKeyPart(message),
		],
		enabled: !!destinationSwapRoute && !!message,
		queryFn: () =>
			destinationSwapRoute && message
				? queryDestinationSwapFee(destinationSwapRoute, message)
				: null,
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
	});
};

const useXcmDeliveryFee = (
	route: XcmRoute | null,
	message: XcmVersionedXcm | null,
) =>
	useQuery({
		queryKey: [
			"xcmDeliveryFee",
			route?.origin,
			route?.destination,
			safeQueryKeyPart(message),
		],
		enabled: !!route && !!message,
		queryFn: async () =>
			route && message
				? parseDeliveryFee(await queryDeliveryFees(route, message))
				: null,
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
	});

type UseXcmQuoteProps = {
	route: XcmRoute | null;
	beneficiary: SS58String | null;
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined;
};

export const useXcmQuote = ({
	route,
	beneficiary,
	call,
	fakeCall,
}: UseXcmQuoteProps): XcmQuoteState => {
	const destinationParaId = route && getChainById(route.destination).paraId;

	const origin = useDryRun({ chainId: route?.origin, from: beneficiary, call });
	const originEstimate = useDryRun({
		chainId: route?.origin,
		from: beneficiary,
		call: fakeCall,
	});

	const originLeg = useMemo(
		() =>
			origin.data && destinationParaId
				? parseOriginDryRun(origin.data, destinationParaId)
				: undefined,
		[origin.data, destinationParaId],
	);

	const estimateMessage = useMemo(() => {
		if (!originEstimate.data || !destinationParaId) return null;
		const leg = parseOriginDryRun(originEstimate.data, destinationParaId);
		return leg.success ? leg.value.message : null;
	}, [originEstimate.data, destinationParaId]);

	const message = originLeg?.success ? originLeg.value.message : null;

	const deliveryFee = useXcmDeliveryFee(route, message);
	const estimatedDeliveryFee = useXcmDeliveryFee(route, estimateMessage);
	const destinationSwapFee = useDestinationSwapFee(route, message);

	const destination = useQuery({
		queryKey: [
			"xcmDestinationDryRun",
			route?.origin,
			route?.destination,
			route?.tokenIdOut,
			beneficiary,
			safeQueryKeyPart(message),
		],
		enabled: !!route && !!beneficiary && !!message,
		queryFn: async () =>
			route && beneficiary && message
				? parseDestinationDryRun(await queryDestinationDryRun(route, message), {
						tokenId: route.tokenIdOut,
						beneficiary,
					})
				: null,
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
	});

	const data = useMemo((): XcmQuoteResult | undefined => {
		if (!route) return undefined;
		if (origin.error)
			return { success: false, failure: { kind: "origin-unavailable" } };
		if (!originLeg) return undefined;
		if (!originLeg.success)
			return { success: false, failure: originLeg.failure };
		if (destination.error)
			return { success: false, failure: { kind: "destination-unavailable" } };
		if (destination.data && !destination.data.success)
			return { success: false, failure: destination.data.failure };
		if (deliveryFee.error || deliveryFee.data === null)
			return { success: false, failure: { kind: "delivery-fee-unavailable" } };
		if (destinationSwapFee.error || destinationSwapFee.data === null)
			return {
				success: false,
				failure: { kind: "destination-fee-unavailable" },
			};
		if (!destination.data || deliveryFee.data === undefined) return undefined;
		const quote = composeXcmQuote(route, {
			sent: originLeg.value.sent,
			received: destination.data.value,
			destinationSwapFee: destinationSwapFee.data,
		});
		return quote && { success: true, quote };
	}, [
		route,
		origin.error,
		originLeg,
		destination.error,
		destination.data,
		deliveryFee.error,
		deliveryFee.data,
		destinationSwapFee.error,
		destinationSwapFee.data,
	]);

	const deliveryFeePlancks = deliveryFee.data ?? estimatedDeliveryFee.data;

	return {
		isLoading:
			origin.isLoading ||
			(!!message &&
				(destination.isLoading ||
					deliveryFee.isLoading ||
					destinationSwapFee.isLoading)),
		data,
		deliveryFee:
			route && isBigInt(deliveryFeePlancks)
				? {
						tokenId: getDeliveryFeeTokenId(route.origin),
						plancks: deliveryFeePlancks,
					}
				: undefined,
	};
};
