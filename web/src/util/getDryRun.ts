import { type Api, isApiWithDryRun } from "@kheopswap/papi";
import {
	type ChainId,
	type ChainIdWithDryRun,
	DispatchRawOrigin,
	PolkadotRuntimeOriginCaller,
} from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import type { AnyTransaction } from "src/types";

export type DryRun<Id extends ChainId> = Id extends ChainIdWithDryRun
	? Awaited<ReturnType<Api<Id>["apis"]["DryRunApi"]["dry_run_call"]>>
	: never;

export const getDryRun = <
	Id extends ChainId,
	Res = Promise<DryRun<ChainId> | null>,
>(
	api: Api<Id>,
	from: string,
	decodedCall: AnyTransaction["decodedCall"],
	signal?: AbortSignal,
): Res => {
	if (!isApiWithDryRun(api)) return null as Res;

	logger.debug("[api call] DryRunApi.dry_run_call", {
		chainId: api.chainId,
		decodedCall,
	});

	// @ts-ignore because of complexity of resulting type
	return api.apis.DryRunApi.dry_run_call(
		PolkadotRuntimeOriginCaller.system(DispatchRawOrigin.Signed(from)),
		decodedCall,
		{ at: "best", signal },
	) as Res;
};
