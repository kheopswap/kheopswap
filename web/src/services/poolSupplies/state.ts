import { BehaviorSubject, combineLatest, map, throttleTime } from "rxjs";

import { PoolSupplyId, PoolSupplyState } from "./types";
import { poolSuppliesSubscriptions$ } from "./subscriptions";
import { poolSuppliesStatuses$ } from "./watchers";
import { poolSuppliesStore$ } from "./store";

import { logger } from "src/util";
import { LoadingStatus } from "src/services/common";

// contains all known pool supplies and their status
export const poolSuppliesState$ = new BehaviorSubject<
  Record<PoolSupplyId, PoolSupplyState>
>({});

// maintain the above up to date
combineLatest([
  poolSuppliesSubscriptions$, // unique subscriptions
  poolSuppliesStatuses$, // status of each subscription
  poolSuppliesStore$, // stored balances
])
  .pipe(
    throttleTime(50, undefined, { trailing: true }),
    map(([poolSupplyIds, statuses, poolSupplies]) => {
      const supplyByPoolSupplyId = new Map<PoolSupplyId, string>(
        poolSupplies.map((s) => [s.id, s.supply] as const),
      );

      const allPoolSupplyIds = [
        ...new Set<PoolSupplyId>(
          poolSupplyIds.concat([...supplyByPoolSupplyId.keys()]),
        ),
      ];

      const poolSuppliesMap = Object.fromEntries(
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

      logger.debug(
        "[pool supplies report] subscriptions:%d | stale:%d | loading:%d | loaded:%d | total_stored:%d",
        poolSupplyIds.length,
        Object.values(poolSuppliesMap).filter((b) => b.status === "stale")
          .length,
        Object.values(poolSuppliesMap).filter((b) => b.status === "loading")
          .length,
        Object.values(poolSuppliesMap).filter((b) => b.status === "loaded")
          .length,
        poolSupplies.length,
      );

      return poolSuppliesMap;
    }),
  )
  .subscribe((poolSupplies) => {
    poolSuppliesState$.next(poolSupplies);
  });
