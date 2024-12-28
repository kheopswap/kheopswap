import type { ChainId } from "@kheopswap/registry";
import {
	type LoadableState,
	getCachedObservable$,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
	safeQueryKeyPart,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import type { SS58String } from "polkadot-api";
import {
	type Observable,
	catchError,
	from,
	map,
	of,
	shareReplay,
	switchMap,
} from "rxjs";
import type { AnyTransaction } from "src/types";
import { type DryRun, getDryRun } from "src/util";
import { getApiEachBlock$ } from "./blockNumber";

const STR_SPLITTER = "||";

const serializeParams = (...args: unknown[]) => {
	return args.map(safeQueryKeyPart).join(STR_SPLITTER);
};

export const getDryRunCall$ = (
	chainId: ChainId,
	fromAddress: SS58String,
	call: AnyTransaction["decodedCall"],
) =>
	getCachedObservable$(
		"getDryRunCall$",
		serializeParams(chainId, fromAddress, call),
		() => {
			return getApiEachBlock$(chainId).pipe(
				switchMap(
					({
						data: api,
						isLoading: isLoadingApi,
						error: errorApi,
					}): Observable<LoadableState<DryRun<ChainId> | null>> => {
						if (errorApi)
							return of(loadableStateError<DryRun<ChainId>>(errorApi));
						if (!api && !isLoadingApi)
							return of(
								loadableStateError<DryRun<ChainId>>(
									new Error(`Api not found - ${chainId}`),
								),
							);
						if (!api) return of(loadableStateLoading<DryRun<ChainId>>());

						return from(
							getDryRun(
								api,
								fromAddress,
								call,
							) as Promise<DryRun<ChainId> | null>,
						).pipe(map((dryRun) => loadableStateData(dryRun)));
					},
				),
				catchError((error) =>
					of(loadableStateError<DryRun<ChainId> | null>(error)),
				),
				shareReplay({ refCount: true, bufferSize: 1 }),
			);
		},
	);

export const [useDryRunCall] = bind(
	(
		chainId: ChainId | null | undefined,
		from: SS58String | null | undefined,
		call: AnyTransaction["decodedCall"] | null | undefined,
	) =>
		chainId && from && call
			? getDryRunCall$(chainId, from, call)
			: of(loadableStateData<DryRun<ChainId> | null>(null)),
	() => loadableStateLoading<DryRun<ChainId> | null>(),
);
