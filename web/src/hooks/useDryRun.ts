import type { SS58String } from "polkadot-api";

import type { ChainId } from "@kheopswap/registry";
import { useDryRunCall } from "src/state/dryRunCall";
import type { AnyTransaction } from "src/types";

type UseDryRunProps = {
	chainId: ChainId | null | undefined;
	from: SS58String | null | undefined;
	call: AnyTransaction | null | undefined;
};

export const useDryRun = ({ chainId, from, call }: UseDryRunProps) => {
	return useDryRunCall(chainId, from, call?.decodedCall);
	// return useQuery({
	// 	queryKey: ["useDryRun", chainId, from, safeQueryKeyPart(call?.decodedCall)],
	// 	queryFn: async ({ signal }) => {
	// 		if (!chainId || !from || !call) return null;

	// 		if (!isChainIdWithDryRun(chainId)) return null;

	// 		try {
	// 			//return await firstValueFrom(getDryRun(chainId, from, call.decodedCall, signal));
	// 			const api = await getApi(chainId);

	// 			return await getDryRun(api, from, call.decodedCall, signal);

	// 			// logger.debug("[api call] DryRunApi.dry_run_call", {
	// 			// 	chainId,
	// 			// 	from,
	// 			// 	decoded: call.decodedCall,
	// 			// });

	// 			// // @ts-ignore
	// 			// const dryRun = await api.apis.DryRunApi.dry_run_call(
	// 			// 	PolkadotRuntimeOriginCaller.system(DispatchRawOrigin.Signed(from)),
	// 			// 	call.decodedCall,
	// 			// 	{ at: "best", signal },
	// 			// );

	// 			// logger.debug("[dry run]", { dryRun, call: call.decodedCall });

	// 			// return dryRun;
	// 		} catch (err) {
	// 			logger.error("[dry run]", { err, call: call.decodedCall });
	// 			throw err;
	// 		}
	// 	},
	// 	retry: 1,
	// 	refetchInterval: false,
	// 	structuralSharing: false,
	// });
};
