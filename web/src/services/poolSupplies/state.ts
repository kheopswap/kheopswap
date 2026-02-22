import { combineLatest, map, shareReplay, throttleTime } from "rxjs";
import { logger } from "../../utils/logger";
import type { LoadingStatus } from "../common";
import type { PoolSuppliesStoreData } from "./store";
import { poolSuppliesStore$ } from "./store";
import { poolSuppliesSubscriptions$ } from "./subscriptions";
import type { PoolSupplyId, PoolSupplyState } from "./types";
import { poolSuppliesStatuses$ } from "./watchers";

const combineState = (
	poolSupplyIds: string[],
	statuses: Record<string, LoadingStatus>,
	poolSupplies: PoolSuppliesStoreData,
): Record<PoolSupplyId, PoolSupplyState> => {
	const stop = logger.cumulativeTimer("poolSupplies.combineState");

	try {
		const allPoolSupplyIds = [
			...new Set<PoolSupplyId>(poolSupplyIds.concat(Object.keys(poolSupplies))),
		];

		return Object.fromEntries(
			allPoolSupplyIds.map((poolSupplyId) => {
				const status = statuses[poolSupplyId] ?? "stale";
				const supplyStr = poolSupplies[poolSupplyId];
				const supply = supplyStr !== undefined ? BigInt(supplyStr) : undefined;

				return [poolSupplyId, { status, supply }];
			}),
		) as Record<
			PoolSupplyId,
			{ status: LoadingStatus; supply: bigint | undefined }
		>;
	} catch (err) {
		logger.error("Failed to merge pool supplies state", { err });
		return {};
	} finally {
		stop();
	}
};

export const poolSuppliesState$ = combineLatest([
	poolSuppliesSubscriptions$, // unique subscriptions
	poolSuppliesStatuses$, // status of each subscription
	poolSuppliesStore$, // stored supplies (dictionary)
]).pipe(
	throttleTime(100, undefined, { leading: true, trailing: true }),
	map(([poolSupplyIds, statuses, poolSupplies]) =>
		combineState(poolSupplyIds, statuses, poolSupplies),
	),
	shareReplay(1),
);
