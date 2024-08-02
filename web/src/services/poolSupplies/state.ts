import { BehaviorSubject, combineLatest, debounceTime, map, tap } from "rxjs";

import { PoolSupplyId, PoolSupplyState, StoredPoolSupply } from "./types";
import { poolSuppliesSubscriptions$ } from "./subscriptions";
import { poolSuppliesStatuses$ } from "./watchers";
import { poolSuppliesStore$ } from "./store";

import { logger } from "src/util";
import { LoadingStatus } from "src/services/common";

const combineState = (
	poolSupplyIds: string[],
	statuses: Record<string, LoadingStatus>,
	poolSupplies: StoredPoolSupply[],
): Record<PoolSupplyId, PoolSupplyState> => {
	try {
		const supplyByPoolSupplyId = new Map<PoolSupplyId, string>(
			poolSupplies.map((s) => [s.id, s.supply] as const),
		);

		const allPoolSupplyIds = [
			...new Set<PoolSupplyId>(
				poolSupplyIds.concat([...supplyByPoolSupplyId.keys()]),
			),
		];

		return Object.fromEntries(
			allPoolSupplyIds.map((poolSupplyId) => {
				const status = statuses[poolSupplyId] ?? "stale";
				const supply = supplyByPoolSupplyId.has(poolSupplyId)
					? BigInt(supplyByPoolSupplyId.get(poolSupplyId) as string)
					: undefined;

				return [poolSupplyId, { status, supply }];
			}),
		) as Record<
			PoolSupplyId,
			{ status: LoadingStatus; supply: bigint | undefined }
		>;
	} catch (err) {
		logger.error("Failed to merge pool supplies state", { err });
		return {};
	}
};

// contains all known pool supplies and their status
export const poolSuppliesState$ = new BehaviorSubject<
	Record<PoolSupplyId, PoolSupplyState>
>(combineState([], {}, poolSuppliesStore$.value));

// maintain the above up to date
combineLatest([
	poolSuppliesSubscriptions$, // unique subscriptions
	poolSuppliesStatuses$, // status of each subscription
	poolSuppliesStore$, // stored supplies
])
	.pipe(
		debounceTime(50),
		map(([poolSupplyIds, statuses, poolSupplies]) =>
			combineState(poolSupplyIds, statuses, poolSupplies),
		),
		tap((poolSuppliesMap) => {
			if (!import.meta.env.DEV) return;

			const values = Object.values(poolSuppliesMap);

			logger.debug(
				"[pool supplies report] stale:%d | loading:%d | loaded:%d | total_stored:%d",
				values.filter((b) => b.status === "stale").length,
				values.filter((b) => b.status === "loading").length,
				values.filter((b) => b.status === "loaded").length,
				values.length,
			);
		}),
	)
	.subscribe((poolSupplies) => {
		poolSuppliesState$.next(poolSupplies);
	});
