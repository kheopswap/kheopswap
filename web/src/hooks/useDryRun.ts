import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { Enum, type SS58String } from "polkadot-api";
import { type Api, getApi } from "../papi/getApi";
import type { ChainId } from "../registry/chains/types";
import type { TokenId } from "../registry/tokens/types";
import type { AnyTransaction } from "../types/transactions";
import { logger } from "../utils/logger";
import { safeQueryKeyPart } from "../utils/safeQueryKeyPart";
import {
	CHAIN_QUERY_TIMEOUT_MS,
	retryOnceUnlessTimedOut,
	withTimeout,
} from "../utils/withTimeout";

const XCM_VERSION = 5;

export type AccountBalance = { balance: bigint; frozen: bigint };

type UseDryRunProps<Id extends ChainId = ChainId> = {
	chainId: Id | null | undefined;
	from: SS58String | null | undefined;
	call: AnyTransaction | null | undefined;
	balances?: Partial<Record<TokenId, AccountBalance | undefined>>;
	enabled?: boolean;
};

export type DryRun<Id extends ChainId> = Awaited<
	ReturnType<Api<Id>["apis"]["DryRunApi"]["dry_run_call"]>
>;

// every chain's dry_run_call takes its own call and origin enums, which a call built
// from the same chain's descriptors already matches at runtime
type DryRunCall = (
	origin: ReturnType<typeof getSignedOrigin>,
	call: AnyTransaction["decodedCall"],
	resultXcmsVersion: number,
	options: { at: "best" },
) => Promise<DryRun<ChainId>>;

const getSignedOrigin = (from: SS58String) =>
	Enum("system", Enum("Signed", from));

const queryDryRun = async (
	chainId: ChainId,
	from: SS58String,
	call: AnyTransaction,
) => {
	try {
		const api = await getApi(chainId);
		const dryRunCall = api.apis.DryRunApi.dry_run_call as DryRunCall;

		const dryRun = await dryRunCall(
			getSignedOrigin(from),
			call.decodedCall,
			XCM_VERSION,
			{ at: "best" },
		);

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
};

export function useDryRun<Id extends ChainId>(
	props: UseDryRunProps<Id>,
): UseQueryResult<DryRun<Id> | null>;
export function useDryRun({
	chainId,
	from,
	call,
	balances,
	enabled = true,
}: UseDryRunProps) {
	return useQuery({
		queryKey: [
			"useDryRun",
			chainId,
			from,
			safeQueryKeyPart(call?.decodedCall),
			safeQueryKeyPart(balances),
		],
		queryFn: ({ signal }) =>
			chainId && from && call
				? withTimeout(queryDryRun(chainId, from, call), {
						ms: CHAIN_QUERY_TIMEOUT_MS,
						signal,
					})
				: null,
		enabled,
		retry: retryOnceUnlessTimedOut,
		refetchInterval: false,
		refetchOnWindowFocus: false,
		structuralSharing: false,
	});
}
