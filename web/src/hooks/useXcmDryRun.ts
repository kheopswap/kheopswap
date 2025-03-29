import { useQuery } from "@tanstack/react-query";

import { getApi } from "@kheopswap/papi";
import { type ChainId, isChainIdWithDryRun } from "@kheopswap/registry";
import { logger, safeQueryKeyPart } from "@kheopswap/utils";
import { type XcmMessage, getXcmDryRun } from "src/util";

type UseXcmDryRunProps = {
	chainId: ChainId | null | undefined;
	originChainId: ChainId | null | undefined;
	xcm: XcmMessage | null | undefined;
};

export const useXcmDryRun = ({
	chainId,
	originChainId,
	xcm,
}: UseXcmDryRunProps) => {
	return useQuery({
		queryKey: ["useXcmDryRun", chainId, originChainId, safeQueryKeyPart(xcm)],
		queryFn: async ({ signal }) => {
			if (!chainId || !originChainId || !xcm) return null;

			if (!isChainIdWithDryRun(chainId)) return null;

			try {
				const api = await getApi(chainId);

				return await getXcmDryRun(api, originChainId, xcm, signal);
			} catch (err) {
				logger.error("[dry run] XCM", { err, chainId, originChainId, xcm });
				throw err;
			}
		},
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
	});
};
