import {
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
import type {
	ChainId,
	ChainIdAssetHub,
} from "../../../../registry/chains/types";
import type { TokenAmount } from "../../../../registry/tokens/types";
import type { AnyTransaction } from "../../../../types/transactions";
import {
	retryOnceUnlessAborted,
	withChainQueryTimeout,
} from "../../../../utils/chainQueryTimeout";
import { isBigInt } from "../../../../utils/isBigInt";
import { safeQueryKeyPart } from "../../../../utils/safeQueryKeyPart";
import { getXcmFirstHop, getXcmHub, type XcmRoute } from "../swapRoute";
import type { XcmDryRunBalances } from "./useXcmDryRunBalances";
import {
	getHopDestination,
	getHopInbound,
	type XcmHop,
	type XcmHopInbound,
} from "./xcmHop";
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

const queryDeliveryFees = async (
	firstHop: XcmHop<XcmRoute["origin"]>,
	message: XcmVersionedXcm,
	querySignal: AbortSignal,
) => {
	const destination = XcmVersionedLocation.V5(getHopDestination(firstHop));
	const origin = firstHop.from;
	switch (origin) {
		case "pah":
		case "kah":
		case "wah":
		case "pasah":
		case "ppeople":
		case "kpeople":
		case "wpeople": {
			const api = await getApi(origin);
			return withChainQueryTimeout(querySignal, (signal) =>
				api.apis.XcmPaymentApi.query_delivery_fees(
					destination,
					message,
					XcmVersionedAssetId.V5({
						parents: 1,
						interior: XcmV5Junctions.Here(),
					}),
					{ at: "best", signal },
				),
			);
		}
		case "hydration": {
			const api = await getApi(origin);
			return withChainQueryTimeout(querySignal, (signal) =>
				api.apis.XcmPaymentApi.query_delivery_fees(destination, message, {
					at: "best",
					signal,
				}),
			);
		}
	}
};

const queryHubDryRun = async (
	hub: ChainIdAssetHub,
	{ origin, message }: XcmHopInbound,
	querySignal: AbortSignal,
) => {
	const api = await getApi(hub);
	return withChainQueryTimeout(querySignal, (signal) =>
		api.apis.DryRunApi.dry_run_xcm(origin, message, {
			at: "best",
			signal,
		}),
	);
};

const queryDestinationDryRun = async (
	destination: XcmRoute["destination"],
	{ origin, message }: XcmHopInbound,
	querySignal: AbortSignal,
) => {
	const api = await getApi(destination);
	return withChainQueryTimeout(querySignal, (signal) =>
		api.apis.DryRunApi.dry_run_xcm(origin, message, {
			at: "best",
			signal,
		}),
	);
};

const useXcmDeliveryFee = (
	firstHop: XcmHop<XcmRoute["origin"]> | null,
	message: XcmVersionedXcm | null,
) =>
	useQuery({
		queryKey: [
			"xcmDeliveryFee",
			firstHop?.from,
			firstHop?.to,
			safeQueryKeyPart(message),
		],
		enabled: !!firstHop && !!message,
		queryFn: async ({ signal }) =>
			firstHop && message
				? parseDeliveryFee(await queryDeliveryFees(firstHop, message, signal))
				: null,
		retry: retryOnceUnlessAborted,
		refetchInterval: false,
		structuralSharing: false,
	});

const useXcmHop = <From extends ChainId>(
	from: From | null | undefined,
	to: ChainId | null | undefined,
): XcmHop<From> | null =>
	useMemo(() => (from && to ? { from, to } : null), [from, to]);

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
	const firstHop = useXcmHop(route?.origin, route && getXcmFirstHop(route));

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
			origin.data && firstHop
				? parseOriginDryRun(origin.data, firstHop)
				: undefined,
		[origin.data, firstHop],
	);

	const estimateMessage = useMemo(() => {
		if (!originEstimate.data || !firstHop) return null;
		const leg = parseOriginDryRun(originEstimate.data, firstHop);
		return leg.success ? leg.value.message : null;
	}, [originEstimate.data, firstHop]);

	const message = originLeg?.success ? originLeg.value.message : null;

	const deliveryFee = useXcmDeliveryFee(firstHop, message);
	const estimatedDeliveryFee = useXcmDeliveryFee(firstHop, estimateMessage);

	const hubLeg = useQuery({
		queryKey: [
			"xcmHubDryRun",
			route?.origin,
			hub,
			route?.destination,
			safeQueryKeyPart(message),
		],
		enabled: !!route && !!hub && !!firstHop && !!message,
		queryFn: async ({ signal }) =>
			route && hub && firstHop && message
				? parseHubDryRun(
						await queryHubDryRun(hub, getHopInbound(firstHop, message), signal),
						{ from: hub, to: route.destination },
					)
				: null,
		retry: retryOnceUnlessAborted,
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
		queryFn: async ({ signal }) =>
			route && beneficiary && destinationMessage
				? parseDestinationDryRun(
						await queryDestinationDryRun(
							route.destination,
							getHopInbound(
								{ from: hub ?? route.origin, to: route.destination },
								destinationMessage,
							),
							signal,
						),
						{ tokenId: route.tokenIdOut, beneficiary },
					)
				: null,
		retry: retryOnceUnlessAborted,
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
