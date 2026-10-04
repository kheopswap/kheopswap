import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { Enum, type SS58String } from "polkadot-api";
import { type Api, getApi } from "../papi/getApi";
import type { ChainId } from "../registry/chains/types";
import type { AnyTransaction } from "../types/transactions";
import { logger } from "../utils/logger";
import { safeQueryKeyPart } from "../utils/safeQueryKeyPart";

const XCM_VERSION = 5;

type UseDryRunProps<Id extends ChainId = ChainId> = {
	chainId: Id | null | undefined;
	from: SS58String | null | undefined;
	call: AnyTransaction | null | undefined;
};

export type DryRun<Id extends ChainId> = Awaited<
	ReturnType<Api<Id>["apis"]["DryRunApi"]["dry_run_call"]>
>;

export function useDryRun<Id extends ChainId>(
	props: UseDryRunProps<Id>,
): UseQueryResult<DryRun<Id> | null>;
export function useDryRun({ chainId, from, call }: UseDryRunProps) {
	return useQuery({
		queryKey: ["useDryRun", chainId, from, safeQueryKeyPart(call?.decodedCall)],
		queryFn: async () => {
			if (!chainId || !from || !call) return null;

			try {
				const api = await getApi(chainId);

				const origin = Enum("system", Enum("Signed", from));

				// @ts-expect-error
				const dryRun = (await api.apis.DryRunApi.dry_run_call(
					origin,
					call.decodedCall,
					XCM_VERSION,
					{ at: "best" },
				)) as DryRun<ChainId>;

				logger.debug("[dry run]", {
					dryRun,
					call: call.decodedCall,
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
}
