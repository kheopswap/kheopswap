import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import { useDryRun } from "../../../../hooks/useDryRun";
import { getChainById } from "../../../../registry/chains/chains";
import type { AnyTransaction } from "../../../../types/transactions";
import type { XcmDestinationSwapRoute } from "../swapRoute";
import { useDestinationSwapFee } from "../xcm/useXcmQuote";
import {
	getDestinationSwapPlancksIn,
	type Parsed,
	parseOriginDryRun,
} from "../xcm/xcmQuote";

export const useDestinationSwapPlancksIn = ({
	route,
	beneficiary,
	unquotedCall,
}: {
	route: XcmDestinationSwapRoute | null;
	beneficiary: SS58String | null;
	unquotedCall: AnyTransaction | null | undefined;
}): { isLoading: boolean; data: Parsed<bigint> | undefined } => {
	const origin = useDryRun({
		chainId: route?.origin,
		from: beneficiary,
		call: unquotedCall,
	});

	const originLeg = useMemo(
		() =>
			route && origin.data
				? parseOriginDryRun(origin.data, getChainById(route.destination).paraId)
				: undefined,
		[route, origin.data],
	);
	const message = originLeg?.success ? originLeg.value.message : null;
	const fee = useDestinationSwapFee(route, message);

	const data = useMemo((): Parsed<bigint> | undefined => {
		if (origin.error)
			return { success: false, failure: { kind: "origin-unavailable" } };
		if (!originLeg?.success) return originLeg;
		if (fee.error || fee.data === null)
			return {
				success: false,
				failure: { kind: "destination-fee-unavailable" },
			};
		return fee.data === undefined
			? undefined
			: getDestinationSwapPlancksIn(originLeg.value.sent, fee.data);
	}, [origin.error, originLeg, fee.error, fee.data]);

	return { isLoading: origin.isLoading || fee.isLoading, data };
};
