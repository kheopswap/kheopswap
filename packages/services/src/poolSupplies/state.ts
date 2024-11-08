import { combineLatest, map, shareReplay, throttleTime } from "rxjs";

import { poolSuppliesStore$ } from "./store";
import { poolSuppliesSubscriptions$ } from "./subscriptions";
import type { PoolSupplyId, PoolSupplyState, StoredPoolSupply } from "./types";
import { poolSuppliesStatuses$ } from "./watchers";

import { logger } from "@kheopswap/utils";
import type { LoadingStatus } from "../common";

const combineState = (
	poolSupplyIds: string[],
	statuses: Record<string, LoadingStatus>,
	poolSupplies: StoredPoolSupply[],
): Record<PoolSupplyId, PoolSupplyState> => {
	const stop = logger.cumulativeTimer("poolSupplies.combineState");

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
	} finally {
		stop();
	}
};

export const poolSuppliesState$ = combineLatest([
	poolSuppliesSubscriptions$, // unique subscriptions
	poolSuppliesStatuses$, // status of each subscription
	poolSuppliesStore$, // stored supplies
]).pipe(
	throttleTime(100, undefined, { leading: true, trailing: true }),
	map(([poolSupplyIds, statuses, poolSupplies]) =>
		combineState(poolSupplyIds, statuses, poolSupplies),
	),
	shareReplay(1),
);
