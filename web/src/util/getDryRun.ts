import { type Api, isApiWithDryRun } from "@kheopswap/papi";
import {
	type ChainId,
	type ChainIdWithDryRun,
	DispatchRawOrigin,
	PolkadotRuntimeOriginCaller,
} from "@kheopswap/registry";
import type { AnyTransaction } from "src/types";

export type DryRun<Id extends ChainId> = Id extends ChainIdWithDryRun
	? Awaited<ReturnType<Api<Id>["apis"]["DryRunApi"]["dry_run_call"]>>
	: never;

export const getDryRun = <Id extends ChainId, Res = DryRun<ChainId> | null>(
	api: Api<Id>,
	from: string,
	call: AnyTransaction,
): Res => {
	if (!isApiWithDryRun(api)) return null as Res;

	// @ts-ignore because of complexity of resulting type
	return api.apis.DryRunApi.dry_run_call(
		PolkadotRuntimeOriginCaller.system(DispatchRawOrigin.Signed(from)),
		call.decodedCall,
		{ at: "best" },
	) as Res;
};
