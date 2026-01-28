import { getApi } from "@kheopswap/papi";
import {
	type ChainId,
	getTokenIdFromXcmV5Multilocation,
	isChainIdAssetHub,
	isChainIdRelay,
	type XcmV5Instruction,
	XcmV5Junctions,
	type XcmV5Multilocation,
	XcmVersionedAssetId,
} from "@kheopswap/registry";
import { logger, safeQueryKeyPart } from "@kheopswap/utils";
import { useQuery } from "@tanstack/react-query";
import { Enum, type SS58String } from "polkadot-api";
import type { AnyTransaction } from "src/types";
import { getXcmMessageFromDryRun } from "src/util";
import { useDryRun } from "./useDryRun";

type UseEstimateDeliveryFeeProps = {
	chainId: ChainId | null | undefined;
	from: SS58String | null | undefined;
	call: AnyTransaction | null | undefined;
};

export const useEstimateDeliveryFee = ({
	chainId,
	from,
	call,
}: UseEstimateDeliveryFeeProps) => {
	const { data: dryRun, isLoading: dryRunIsLoading } = useDryRun({
		chainId,
		from,
		call,
	});

	return useQuery({
		queryKey: [
			"useEstimateDeliveryFee",
			chainId,
			from,
			safeQueryKeyPart(call?.decodedCall),
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

			try {
				const api = await getApi(chainId);

				const deliveryFee = await api.apis.XcmPaymentApi.query_delivery_fees(
					Enum("V5", xcm.destination),
					Enum("V5", xcm.message as XcmV5Instruction[]),
					XcmVersionedAssetId.V5({
						parents: isChainIdAssetHub(chainId) ? 1 : 0,
						interior: XcmV5Junctions.Here(),
					}),
					{ at: "best", signal },
				);

				const assets =
					deliveryFee.success &&
					deliveryFee.value.type === "V5" &&
					deliveryFee.value.value;
				if (!assets) throw new Error("Failed to estimate");
				if (assets.length !== 1) throw new Error("Failed to estimate");
				const fee = deliveryFee.value.value[0];
				if (fee?.fun.type !== "Fungible")
					throw new Error("Unexpected fee type");

				const tokenId = getTokenIdFromXcmV5Multilocation(
					chainId,
					fee.id as XcmV5Multilocation,
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
