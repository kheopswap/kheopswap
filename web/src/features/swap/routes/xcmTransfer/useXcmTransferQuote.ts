import {
	XcmV5Junction,
	XcmV5Junctions,
	XcmVersionedLocation,
} from "@polkadot-api/descriptors";
import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import { useDryRun } from "../../../../hooks/useDryRun";
import { getApi } from "../../../../papi/getApi";
import { getChainById } from "../../../../registry/chains/chains";
import type { AnyTransaction } from "../../../../types/transactions";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import type { XcmTransferRoute } from "../swapRoute";
import {
	composeXcmQuote,
	parseDestinationDryRun,
	parseOriginDryRun,
	type XcmQuoteResult,
} from "./xcmQuote";

export type XcmTransferQuote = {
	isLoading: boolean;
	data: XcmQuoteResult | undefined;
	deliveryFee: bigint | undefined;
};

type UseXcmTransferQuoteProps = {
	route: XcmTransferRoute | null;
	beneficiary: SS58String | null;
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined;
	plancks: bigint | null | undefined;
};

export const useXcmTransferQuote = ({
	route,
	beneficiary,
	call,
	fakeCall,
	plancks,
}: UseXcmTransferQuoteProps): XcmTransferQuote => {
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

	const estimatedDeliveryFee = useMemo(() => {
		if (!originEstimate.data || !destinationParaId) return undefined;
		const leg = parseOriginDryRun(originEstimate.data, destinationParaId);
		return leg.success ? leg.value.deliveryFee : undefined;
	}, [originEstimate.data, destinationParaId]);

	const message = originLeg?.success ? originLeg.value.message : null;

	const destination = useQuery({
		queryKey: [
			"xcmTransferDestinationDryRun",
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
		if (!destination.data || !plancks) return undefined;
		if (!destination.data.success)
			return { success: false, failure: destination.data.failure };
		return {
			success: true,
			quote: composeXcmQuote(
				plancks,
				originLeg.value.deliveryFee,
				destination.data.value,
			),
		};
	}, [origin.error, originLeg, destination.error, destination.data, plancks]);

	return {
		isLoading: origin.isLoading || (!!message && destination.isLoading),
		data,
		deliveryFee: originLeg?.success
			? originLeg.value.deliveryFee
			: estimatedDeliveryFee,
	};
};
