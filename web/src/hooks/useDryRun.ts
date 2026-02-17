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
				const unsafeApi = api.client.getUnsafeApi();
				const resultXcmsVersion =
					// biome-ignore lint/style/noNonNullAssertion: PolkadotXcm exists on all Asset Hub chains
					((await unsafeApi.query.PolkadotXcm!.SafeXcmVersion!.getValue()) as
						| number
						| undefined) ?? 4;

				const origin = Enum("system", Enum("Signed", from));

				// @ts-expect-error
				const dryRun = (await api.apis.DryRunApi.dry_run_call(
					origin,
					call.decodedCall,
					resultXcmsVersion,
					{ at: "best" },
				)) as DryRun<ChainId>;

				logger.debug("[dry run]", {
					dryRun,
					call: call.decodedCall,
					resultXcmsVersion,
					chainId: api.chainId,
				});

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
