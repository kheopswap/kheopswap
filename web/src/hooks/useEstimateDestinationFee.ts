import { useQuery } from "@tanstack/react-query";
import { Enum, type SS58String } from "polkadot-api";

import { getApi } from "@kheopswap/papi";
import {
	type ChainId,
	type ChainIdAssetHub,
	type ChainIdRelay,
	XcmV3Junctions,
	type XcmV3Multilocation,
	type XcmV4Instruction,
	XcmVersionedAssetId,
	getChainById,
	getChains,
	getTokenId,
	isAssetHub,
	isChainIdAssetHub,
	isChainIdRelay,
} from "@kheopswap/registry";
import { logger, safeQueryKeyPart } from "@kheopswap/utils";
import type { AnyTransaction } from "src/types";
import { getXcmMessageFromDryRun } from "src/util";
import { useDryRun } from "./useDryRun";

type UseEstimateDestinationFeeProps = {
	chainId: ChainId | null | undefined;
	from: SS58String | null | undefined;
	call: AnyTransaction | null | undefined;
};

const getDestinationChain = (
	originChainId: ChainIdRelay | ChainIdAssetHub,
	location: XcmV3Multilocation,
) => {
	const originChain = getChainById(originChainId);

	if (location.parents === 0 && location.interior.type === "X1") {
		const paraId =
			location.interior.value.type === "Parachain" &&
			location.interior.value.value;
		if (paraId) {
			const chain = getChains().find(
				(chain) => chain.relay === originChain.relay && chain.paraId === paraId,
			);
			if (chain) return chain;
		}
	}

	if (
		originChain.relay &&
		location.parents === 1 &&
		location.interior.type === "Here"
	)
		return getChainById(originChain.relay);

	throw new Error("Unexpected destination chain");
};

export const useEstimateDestinationFee = ({
	chainId,
	from,
	call,
}: UseEstimateDestinationFeeProps) => {
	const { data: dryRun, isLoading: dryRunIsLoading } = useDryRun({
		chainId,
		from,
		call,
	});

	return useQuery({
		queryKey: [
			"useEstimateDestinationFee",
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

			try {
				const xcm = getXcmMessageFromDryRun(dryRun);

				const destinationChain = getDestinationChain(chainId, xcm.destination);

				const api = await getApi(
					destinationChain.id as ChainIdRelay | ChainIdAssetHub,
				);

				const weight = await api.apis.XcmPaymentApi.query_xcm_weight(
					Enum("V4", xcm.message as XcmV4Instruction[]),
					{ at: "best", signal },
				);
				if (!weight.success) throw new Error("Failed to estimate");

				const fee = await api.apis.XcmPaymentApi.query_weight_to_asset_fee(
					weight.value,
					XcmVersionedAssetId.V4({
						parents: isAssetHub(destinationChain) ? 1 : 0,
						interior: XcmV3Junctions.Here(),
					}),
				);
				if (!fee.success) throw new Error("Failed to estimate");

				return {
					tokenId: getTokenId({ type: "native", chainId: destinationChain.id }),
					plancks: fee.value,
				};
			} catch (err) {
				logger.error("[useEstimateDestinationFee]", { err });
				throw err;
			}
		},
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
		enabled: !dryRunIsLoading,
	});
};
