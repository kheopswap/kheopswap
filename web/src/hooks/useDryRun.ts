import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";

import { type Api, getApi } from "@kheopswap/papi";
import {
	type ChainId,
	type ChainIdAssetHub,
	type ChainIdRelay,
	PolkadotRuntimeOriginCaller,
	isChainIdAssetHub,
	isChainIdRelay,
} from "@kheopswap/registry";
import { logger, safeQueryKeyPart } from "@kheopswap/utils";
import type { AnyTransaction } from "src/types";

type UseDryRunProps = {
	chainId: ChainId | null | undefined;
	from: SS58String | null | undefined;
	call: AnyTransaction | null | undefined;
};

export type DryRun<Id extends ChainIdRelay | ChainIdAssetHub> = Awaited<
	ReturnType<Api<Id>["apis"]["DryRunApi"]["dry_run_call"]>
>;

export const useDryRun = ({ chainId, from, call }: UseDryRunProps) => {
	return useQuery({
		queryKey: ["useDryRun", chainId, from, safeQueryKeyPart(call?.decodedCall)],
		queryFn: async (
			// TODO put this back	{ signal }
		) => {
			if (!chainId || !from || !call) return null;
			if (!isChainIdAssetHub(chainId) && !isChainIdRelay(chainId)) return null;

			try {
				const api = await getApi(chainId);

				// @ts-ignore
				const dryRun = await api.apis.DryRunApi.dry_run_call(
					PolkadotRuntimeOriginCaller.system({
						type: "Signed",
						value: from,
					}),
					call.decodedCall,
					// TODO put this back	{ at: "best", signal },
				);

				logger.debug("[dry run]", { dryRun, call: call.decodedCall });

				return dryRun;
			} catch (err) {
				logger.error("[dry run]", { err, call: call.decodedCall });
				throw err;
			}
		},
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
	});
};
