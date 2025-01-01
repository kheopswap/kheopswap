import { getApiLoadable$ } from "@kheopswap/papi";
import type { ChainId } from "@kheopswap/registry";
import {
	getCachedPromise,
	loadableData,
	loadableError,
	lodableLoading,
	objectHash,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import type { SS58String } from "polkadot-api";
import {
	catchError,
	distinctUntilChanged,
	from as fromRxjs,
	map,
	of,
	switchMap,
} from "rxjs";
import type { AnyTransaction } from "src/types";
import { type DryRun, getDryRun } from "src/util";

export const [useDryRunCall, getDryRunCall$] = bind(
	(
		chainId: ChainId | null | undefined,
		from: SS58String | null | undefined,
		call: AnyTransaction["decodedCall"] | null | undefined,
	) => {
		if (!chainId || !from || !call)
			return of(loadableData<DryRun<ChainId> | null>(null));

		return getApiLoadable$(chainId).pipe(
			switchMap(({ data: api, isLoading, error }) => {
				if (error) return of(loadableError<DryRun<ChainId> | null>(error));
				if (!api && !isLoading)
					return of(
						loadableError<DryRun<ChainId>>(
							new Error(`Api not found - ${chainId}`),
						),
					);
				if (!api) return of(lodableLoading<DryRun<ChainId>>());

				return api.query.System.Number.watchValue("best").pipe(
					distinctUntilChanged<number>(),
					switchMap((blockNumber) => {
						return fromRxjs(
							getCachedPromise(
								"getDryRun",
								objectHash([api, from, call, blockNumber]),
								() =>
									getDryRun(api, from, call) as Promise<DryRun<ChainId> | null>,
							),
						).pipe(map((dryRun) => loadableData(dryRun)));
					}),
				);
			}),
			catchError((error) => of(loadableError<DryRun<ChainId> | null>(error))),
		);
	},
	() => lodableLoading<DryRun<ChainId> | null>(),
);
