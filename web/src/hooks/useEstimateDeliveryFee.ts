import { useQuery } from "@tanstack/react-query";
import { Enum, type SS58String } from "polkadot-api";

import { getApi } from "@kheopswap/papi";
import {
	type ChainId,
	type XcmV3Multilocation,
	type XcmV4Instruction,
	getTokenIdFromXcmV3Multilocation,
	isChainIdAssetHub,
	isChainIdRelay,
} from "@kheopswap/registry";
import { logger, safeQueryKeyPart } from "@kheopswap/utils";
import { useDryRunCall } from "src/state/dryRunCall";
import type { AnyTransaction } from "src/types";
import { getXcmMessageFromDryRun } from "src/util";

type UseEstimateDeliveryFeeProps = {
	chainId: ChainId | null | undefined;
	from: SS58String | null | undefined;
	call: AnyTransaction["decodedCall"] | null | undefined;
};

export const useEstimateDeliveryFee = ({
	chainId,
	from,
	call,
}: UseEstimateDeliveryFeeProps) => {
	const { data: dryRun, isLoading: dryRunIsLoading } = useDryRunCall(
		chainId,
		from,
		call,
	);

	return useQuery({
		queryKey: [
			"useEstimateDeliveryFee",
			chainId,
			from,
			safeQueryKeyPart(call),
			safeQueryKeyPart(dryRun),
		],
		queryFn: async ({ signal }) => {
			if (
				!chainId ||
				!from ||
				!call ||
				!dryRun?.success ||
				!dryRun.value.execution_result.success
			)
				return null;

			if (!isChainIdAssetHub(chainId) && !isChainIdRelay(chainId)) return null;

			const xcm = getXcmMessageFromDryRun(dryRun);
			if (!xcm) return null;

			try {
				const api = await getApi(chainId);

				logger.debug("[api call] XcmPaymentApi.query_delivery_fees", {
					chainId,
					xcm,
				});

				const deliveryFee = await api.apis.XcmPaymentApi.query_delivery_fees(
					Enum("V4", xcm.destination),
					Enum("V4", xcm.message as XcmV4Instruction[]),
					{ at: "best", signal },
				);

				const assets =
					deliveryFee.success &&
					deliveryFee.value.type === "V4" &&
					deliveryFee.value.value;
				if (!assets) throw new Error("Failed to estimate");
				if (assets.length !== 1) throw new Error("Failed to estimate");
				const fee = deliveryFee.value.value[0];
				if (fee?.fun.type !== "Fungible")
					throw new Error("Unexpected fee type");

				const tokenId = getTokenIdFromXcmV3Multilocation(
					chainId,
					fee.id as XcmV3Multilocation,
				);
				if (!tokenId) throw new Error("Unknown fee token");

				const result = {
					tokenId,
					plancks: fee.fun.value,
				};

				return result;
			} catch (err) {
				logger.error("[useEstimateDeliveryFee]", { err });
				throw err;
			}
		},
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
		enabled: !dryRunIsLoading,
	});
};
