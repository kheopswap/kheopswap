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
import type { AnyTransaction } from "../../../../types/transactions";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import type { XcmRoute } from "../swapRoute";
import {
	composeXcmQuote,
	parseDeliveryFee,
	parseDestinationDryRun,
	parseOriginDryRun,
	type XcmQuoteResult,
} from "./xcmQuote";

export type XcmQuoteState = {
	isLoading: boolean;
	data: XcmQuoteResult | undefined;
	deliveryFee: bigint | undefined;
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
		queryFn: async () => {
			if (!route || !message) return null;
			const api = await getApi(route.origin);
			const deliveryFees = await api.apis.XcmPaymentApi.query_delivery_fees(
				XcmVersionedLocation.V5({
					parents: 1,
					interior: XcmV5Junctions.X1(
						XcmV5Junction.Parachain(getChainById(route.destination).paraId),
					),
				}),
				message,
				XcmVersionedAssetId.V5({ parents: 1, interior: XcmV5Junctions.Here() }),
				{ at: "best" },
			);
			return parseDeliveryFee(deliveryFees);
		},
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
			route?.destinationAssetId,
			beneficiary,
			safeQueryKeyPart(message),
		],
		enabled: !!route && !!beneficiary && !!message,
		queryFn: async () => {
			if (!route || !beneficiary || !message) return null;
			const api = await getApi(route.destination);
			const dryRun = await api.apis.DryRunApi.dry_run_xcm(
				XcmVersionedLocation.V5({
					parents: 1,
					interior: XcmV5Junctions.X1(
						XcmV5Junction.Parachain(getChainById(route.origin).paraId),
					),
				}),
				message,
				{ at: "best" },
			);
			return parseDestinationDryRun(dryRun, {
				assetId: route.destinationAssetId,
				beneficiary,
			});
		},
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
	});

	const data = useMemo((): XcmQuoteResult | undefined => {
		if (origin.error)
			return {
				success: false,
				failure: {
					kind: "origin-failed",
					reason: "Could not simulate the transfer on Asset Hub",
				},
			};
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

	return {
		isLoading:
			origin.isLoading ||
			(!!message && (destination.isLoading || deliveryFee.isLoading)),
		data,
		deliveryFee: deliveryFee.data ?? estimatedDeliveryFee.data ?? undefined,
	};
};
