import type { ChainId } from "@kheopswap/registry";
import {
	type LoadableState,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import type { SS58String } from "polkadot-api";
import {
	type Observable,
	catchError,
	from as fromRxjs,
	map,
	of,
	switchMap,
} from "rxjs";
import type { AnyTransaction } from "src/types";
import { type DryRun, getDryRun } from "src/util";
import { getApiEachBlock$ } from "./blockNumber";

export const [useDryRunCall, getDryRunCall$] = bind(
	(
		chainId: ChainId | null | undefined,
		from: SS58String | null | undefined,
		call: AnyTransaction["decodedCall"] | null | undefined,
	) => {
		if (!chainId || !from || !call)
			return of(loadableStateData<DryRun<ChainId> | null>(null));

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

					return fromRxjs(
						getDryRun(api, from, call) as Promise<DryRun<ChainId> | null>,
					).pipe(map((dryRun) => loadableStateData(dryRun)));
				},
			),
			catchError((error) =>
				of(loadableStateError<DryRun<ChainId> | null>(error)),
			),
		);
	},
	() => loadableStateLoading<DryRun<ChainId> | null>(),
);
