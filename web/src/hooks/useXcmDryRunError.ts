import type { ChainId, ChainIdWithDryRun } from "@kheopswap/registry";
import { safeQueryKeyPart } from "@kheopswap/utils";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { XcmDryRun } from "src/util";

type UseDryRunError = {
	chainId: ChainId | null | undefined;
	xcmDryRun: XcmDryRun<ChainIdWithDryRun> | null | undefined;
};

export const useXcmDryRunError = ({ chainId, xcmDryRun }: UseDryRunError) => {
	const dispatchError = useMemo(() => {
		if (!xcmDryRun?.success) return null;
		switch (xcmDryRun.value.execution_result.type) {
			case "Complete":
				return null;
			case "Error":
				return xcmDryRun.value.execution_result.value.error.type;
			case "Incomplete":
				return xcmDryRun.value.execution_result.value.error.type;
		}
	}, [xcmDryRun]);

	return useQuery({
		queryKey: ["useXcmDryRunError", chainId, safeQueryKeyPart(dispatchError)],
		queryFn: async () => {
			if (!chainId || !dispatchError) return null;
			return null; // await getDispatchErrorMessage(chainId, dispatchError);
		},
	});
};
