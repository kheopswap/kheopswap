import { type Api, getApi } from "@kheopswap/papi";
import type { ChainId } from "@kheopswap/registry";
import { logger, safeQueryKeyPart } from "@kheopswap/utils";
import { Enum } from "@polkadot-api/substrate-bindings";
import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import type { AnyTransaction } from "src/types";

type UseDryRunProps = {
	chainId: ChainId | null | undefined;
	from: SS58String | null | undefined;
	call: AnyTransaction | null | undefined;
};

export type DryRun<Id extends ChainId> = Awaited<
	ReturnType<Api<Id>["apis"]["DryRunApi"]["dry_run_call"]>
>;

export const useDryRun = ({ chainId, from, call }: UseDryRunProps) => {
	return useQuery({
		queryKey: ["useDryRun", chainId, from, safeQueryKeyPart(call?.decodedCall)],
		queryFn: async (
			// TODO put this back	{ signal }
		) => {
			if (!chainId || !from || !call) return null;

			try {
				const api = await getApi(chainId);
				const resultXcmsVersion =
					(await api.query.PolkadotXcm.SafeXcmVersion.getValue()) ?? 4;

				const origin = Enum("system", Enum("Signed", from));

				// @ts-expect-error
				const dryRun = (await api.apis.DryRunApi.dry_run_call(
					origin,
					call.decodedCall,
					resultXcmsVersion,
				)) as DryRun<ChainId>;

				logger.debug("[dry run]", {
					dryRun,
					call: call.decodedCall,
					resultXcmsVersion,
					chainId: api.chainId,
				});

				return dryRun;
			} catch (err) {
				logger.warn("[dry run] unavailable", {
					err,
					call: call.decodedCall,
				});
				return null;
			}
		},
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
	});
};
