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
import type { AnyTransaction } from "../../../../types/transactions";
import { isBigInt } from "../../../../utils/isBigInt";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import type { XcmRoute } from "../swapRoute";
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
		case "pah": {
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
	switch (route.destination) {
		case "pah": {
			const api = await getApi(route.destination);
			return api.apis.DryRunApi.dry_run_xcm(origin, message, { at: "best" });
		}
		case "hydration": {
			const api = await getApi(route.destination);
			return api.apis.DryRunApi.dry_run_xcm(origin, message, { at: "best" });
		}
	}
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
		if (!destination.data || deliveryFee.data === undefined) return undefined;
		return {
			success: true,
			quote: composeXcmQuote(originLeg.value.sent, destination.data.value),
		};
	}, [
		origin.error,
		originLeg,
		destination.error,
		destination.data,
		deliveryFee.error,
		deliveryFee.data,
	]);

	const deliveryFeePlancks = deliveryFee.data ?? estimatedDeliveryFee.data;

	return {
		isLoading:
			origin.isLoading ||
			(!!message && (destination.isLoading || deliveryFee.isLoading)),
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
