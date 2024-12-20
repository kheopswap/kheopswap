import type {
	ChainId,
	ChainIdAssetHub,
	ChainIdRelay,
} from "@kheopswap/registry";
import { safeQueryKeyPart } from "@kheopswap/utils";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getDispatchErrorMessage } from "src/util";
import type { DryRun } from "./useDryRun";

type UseDryRunError = {
	chainId: ChainId | null | undefined;
	dryRun: DryRun<ChainIdRelay | ChainIdAssetHub> | null | undefined;
};

export const useDryRunError = ({ chainId, dryRun }: UseDryRunError) => {
	const dispatchError = useMemo(
		() =>
			dryRun?.success && !dryRun.value.execution_result.success
				? dryRun.value.execution_result.value.error
				: null,
		[dryRun],
	);

	return useQuery({
		queryKey: ["useDryRunError", chainId, safeQueryKeyPart(dispatchError)],
		queryFn: async () => {
			if (!chainId || !dispatchError) return null;
			return await getDispatchErrorMessage(chainId, dispatchError);
		},
	});
};
