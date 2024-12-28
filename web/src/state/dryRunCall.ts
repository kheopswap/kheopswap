import { getApiLoadable$ } from "@kheopswap/papi";
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
	combineLatest,
	from,
	map,
	of,
	startWith,
	switchMap,
} from "rxjs";
import type { AnyTransaction } from "src/types";
import { type DryRun, getDryRun } from "src/util";
import { getBlockNumber$ } from "./blockNumber";

const STR_SPLITTER = "||";

const serializeParams = (...args: unknown[]) => {
	return args.map(safeQueryKeyPart).join(STR_SPLITTER);
};

export const getDryRunCall$ = (
	chainId: ChainId,
	fromAddress: SS58String,
	call: AnyTransaction["decodedCall"],
) =>
	combineLatest([getApiLoadable$(chainId), getBlockNumber$(chainId)]).pipe(
		switchMap(
			([
				{ data: api, isLoading: isLoadingApi, error: errorApi },
				{
					data: blockNumber,
					isLoading: isLoadingBlockNumber,
					error: errorBlockNumber,
				},
			]): Observable<LoadableState<DryRun<ChainId> | null>> => {
				if (errorApi) return of(loadableStateError<DryRun<ChainId>>(errorApi));
				if (errorBlockNumber)
					return of(loadableStateError<DryRun<ChainId>>(errorBlockNumber));
				if (!blockNumber && !isLoadingBlockNumber)
					return of(
						loadableStateError<DryRun<ChainId>>(
							new Error(`Block number not found - ${chainId}`),
						),
					);
				if (!api && !isLoadingApi)
					return of(
						loadableStateError<DryRun<ChainId>>(
							new Error(`Api not found - ${chainId}`),
						),
					);
				if (!blockNumber || !api)
					return of(loadableStateLoading<DryRun<ChainId>>());

				return getCachedObservable$(
					"getDryRunCall$",
					serializeParams(chainId, blockNumber, fromAddress, call),
					() =>
						from(
							getDryRun(
								api,
								fromAddress,
								call,
							) as Promise<DryRun<ChainId> | null>,
						).pipe(map((dryRun) => loadableStateData(dryRun))),
				);
			},
		),
		catchError((error) =>
			of(loadableStateError<DryRun<ChainId> | null>(error)),
		),
		startWith(loadableStateLoading<DryRun<ChainId> | null>()),
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
