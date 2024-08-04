import { BehaviorSubject, combineLatest, debounceTime, map } from "rxjs";

import { poolSuppliesStore$ } from "./store";
import { poolSuppliesSubscriptions$ } from "./subscriptions";
import type { PoolSupplyId, PoolSupplyState, StoredPoolSupply } from "./types";
import { poolSuppliesStatuses$ } from "./watchers";

import type { LoadingStatus } from "src/services/common";
import { logger } from "src/util";

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
	)
	.subscribe((poolSupplies) => {
		poolSuppliesState$.next(poolSupplies);
	});
