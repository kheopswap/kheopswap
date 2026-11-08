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
import type {
	ChainId,
	ChainIdAssetHub,
} from "../../../../registry/chains/types";
import type { TokenAmount } from "../../../../registry/tokens/types";
import type { AnyTransaction } from "../../../../types/transactions";
import {
	retryOnceUnlessTimedOut,
	withChainQueryTimeout,
} from "../../../../utils/chainQueryTimeout";
import { isBigInt } from "../../../../utils/isBigInt";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import { getXcmFirstHop, getXcmHub, type XcmRoute } from "../swapRoute";
import type { XcmDryRunBalances } from "./useXcmDryRunBalances";
import {
	composeXcmQuote,
	getDeliveryFeeTokenId,
	getXcmQuoteSubject,
	parseDeliveryFee,
	parseDestinationDryRun,
	parseHubDryRun,
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

const queryDeliveryFees = async (
	origin: XcmRoute["origin"],
	firstHop: ChainId,
	message: XcmVersionedXcm,
) => {
	const destination = getParachainLocation(firstHop);
	switch (origin) {
		case "pah":
		case "kah":
		case "wah":
		case "pasah":
		case "ppeople":
		case "kpeople":
		case "wpeople": {
			const api = await getApi(origin);
			return withChainQueryTimeout(
				api.apis.XcmPaymentApi.query_delivery_fees(
					destination,
					message,
					XcmVersionedAssetId.V5({
						parents: 1,
						interior: XcmV5Junctions.Here(),
					}),
					{ at: "best" },
				),
			);
		}
		case "hydration": {
			const api = await getApi(origin);
			return withChainQueryTimeout(
				api.apis.XcmPaymentApi.query_delivery_fees(destination, message, {
					at: "best",
				}),
			);
		}
	}
};

const queryHubDryRun = async (
	hub: ChainIdAssetHub,
	origin: ChainId,
	message: XcmVersionedXcm,
) => {
	const api = await getApi(hub);
	return withChainQueryTimeout(
		api.apis.DryRunApi.dry_run_xcm(getParachainLocation(origin), message, {
			at: "best",
		}),
	);
};

const queryDestinationDryRun = async (
	destination: XcmRoute["destination"],
	sender: ChainId,
	message: XcmVersionedXcm,
) => {
	const api = await getApi(destination);
	return withChainQueryTimeout(
		api.apis.DryRunApi.dry_run_xcm(getParachainLocation(sender), message, {
			at: "best",
		}),
	);
};

const useXcmDeliveryFee = (
	route: XcmRoute | null,
	message: XcmVersionedXcm | null,
) =>
	useQuery({
		queryKey: [
			"xcmDeliveryFee",
			route?.origin,
			route && getXcmFirstHop(route),
			safeQueryKeyPart(message),
		],
		enabled: !!route && !!message,
		queryFn: async () =>
			route && message
				? parseDeliveryFee(
						await queryDeliveryFees(
							route.origin,
							getXcmFirstHop(route),
							message,
						),
					)
				: null,
		retry: retryOnceUnlessTimedOut,
		refetchInterval: false,
		structuralSharing: false,
	});

type UseXcmQuoteProps = {
	route: XcmRoute | null;
	destinationFee?: TokenAmount;
	beneficiary: SS58String | null;
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined;
	balances: XcmDryRunBalances;
};

export const useXcmQuote = ({
	route,
	destinationFee,
	beneficiary,
	call,
	fakeCall,
	balances,
}: UseXcmQuoteProps): XcmQuoteState => {
	const hub = route && getXcmHub(route);
	const firstHopParaId = route && getChainById(getXcmFirstHop(route)).paraId;
	const destinationParaId = route && getChainById(route.destination).paraId;

	const origin = useDryRun({
		chainId: route?.origin,
		from: beneficiary,
		call,
		balances: balances.origin,
		enabled: !balances.isLoading,
	});
	const originEstimate = useDryRun({
		chainId: route?.origin,
		from: beneficiary,
		call: fakeCall,
		balances: balances.origin,
		enabled: !balances.isLoading,
	});

	const originLeg = useMemo(
		() =>
			origin.data && firstHopParaId
				? parseOriginDryRun(origin.data, firstHopParaId)
				: undefined,
		[origin.data, firstHopParaId],
	);

	const estimateMessage = useMemo(() => {
		if (!originEstimate.data || !firstHopParaId) return null;
		const leg = parseOriginDryRun(originEstimate.data, firstHopParaId);
		return leg.success ? leg.value.message : null;
	}, [originEstimate.data, firstHopParaId]);

	const message = originLeg?.success ? originLeg.value.message : null;

	const deliveryFee = useXcmDeliveryFee(route, message);
	const estimatedDeliveryFee = useXcmDeliveryFee(route, estimateMessage);

	const hubLeg = useQuery({
		queryKey: [
			"xcmHubDryRun",
			route?.origin,
			hub,
			route?.destination,
			safeQueryKeyPart(message),
		],
		enabled: !!route && !!hub && !!destinationParaId && !!message,
		queryFn: async () =>
			route && hub && destinationParaId && message
				? parseHubDryRun(
						await queryHubDryRun(hub, route.origin, message),
						hub,
						destinationParaId,
					)
				: null,
		retry: retryOnceUnlessTimedOut,
		refetchInterval: false,
		structuralSharing: false,
	});

	const destinationMessage = hub
		? hubLeg.data?.success
			? hubLeg.data.value
			: null
		: message;

	const destination = useQuery({
		queryKey: [
			"xcmDestinationDryRun",
			route?.origin,
			hub,
			route?.destination,
			route?.tokenIdOut,
			beneficiary,
			safeQueryKeyPart(destinationMessage),
		],
		enabled: !!route && !!beneficiary && !!destinationMessage,
		queryFn: async () =>
			route && beneficiary && destinationMessage
				? parseDestinationDryRun(
						await queryDestinationDryRun(
							route.destination,
							hub ?? route.origin,
							destinationMessage,
						),
						{ tokenId: route.tokenIdOut, beneficiary },
					)
				: null,
		retry: retryOnceUnlessTimedOut,
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
		if (hub && hubLeg.error)
			return { success: false, failure: { kind: "hub-unavailable", hub } };
		if (hubLeg.data && !hubLeg.data.success)
			return { success: false, failure: hubLeg.data.failure };
		if (destination.error)
			return { success: false, failure: { kind: "destination-unavailable" } };
		if (destination.data && !destination.data.success)
			return { success: false, failure: destination.data.failure };
		if (deliveryFee.error || deliveryFee.data === null)
			return { success: false, failure: { kind: "delivery-fee-unavailable" } };
		const subject = getXcmQuoteSubject(route, destinationFee);
		if (!destination.data || deliveryFee.data === undefined || !subject)
			return undefined;
		return {
			success: true,
			quote: composeXcmQuote(subject, {
				sent: originLeg.value.sent,
				received: destination.data.value,
			}),
		};
	}, [
		route,
		destinationFee,
		origin.error,
		originLeg,
		hub,
		hubLeg.error,
		hubLeg.data,
		destination.error,
		destination.data,
		deliveryFee.error,
		deliveryFee.data,
	]);

	const deliveryFeePlancks = deliveryFee.data ?? estimatedDeliveryFee.data;

	return {
		isLoading:
			(balances.isLoading && !!call) ||
			origin.isFetching ||
			(!!message &&
				(hubLeg.isFetching ||
					destination.isFetching ||
					deliveryFee.isFetching)),
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
