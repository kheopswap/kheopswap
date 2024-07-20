import { BehaviorSubject, combineLatest, map, throttleTime } from "rxjs";

import { balancesStore$ } from "./store";
import { obsBalanceSubscriptions$ } from "./subscriptions";
import { BalanceId, BalanceState } from "./types";
import { getBalanceId } from "./utils";
import { balanceStatuses$ } from "./watchers";

import { LoadingStatus } from "src/services/common";
import { logger } from "src/util";

// contains all known balances and their status
export const balancesState$ = new BehaviorSubject<
  Record<BalanceId, BalanceState>
>({});

// maintain the above up to date
combineLatest([
  obsBalanceSubscriptions$, // unique subscriptions
  balanceStatuses$, // status of each subscription
  balancesStore$, // stored balances
])
  .pipe(
    throttleTime(50, undefined, { trailing: true }),
    map(([balanceIds, statuses, balances]) => {
      const balancesByBalanceId = new Map<BalanceId, string>(
        balances.map((b) => [getBalanceId(b), b.balance] as const),
      );

      const allBalanceIds = [
        ...new Set<BalanceId>(
          balanceIds.concat([...balancesByBalanceId.keys()]),
        ),
      ];

      const balancesMap = Object.fromEntries(
        allBalanceIds.map((balanceId) => {
          const status = statuses[balanceId] ?? "stale";
          const balance = balancesByBalanceId.has(balanceId)
            ? BigInt(balancesByBalanceId.get(balanceId) as string)
            : undefined;

          return [balanceId, { status, balance }];
        }),
      ) as Record<
        BalanceId,
        { status: LoadingStatus; balance: bigint | undefined }
      >;

      const arBalances = Object.values(balancesMap);
      logger.debug(
        "[balances report] subscriptions:%d | stale:%d | loading:%d | loaded:%d | total_stored:%d",
        balanceIds.length,
        arBalances.filter((b) => b.status === "stale").length,
        arBalances.filter((b) => b.status === "loading").length,
        arBalances.filter((b) => b.status === "loaded").length,
        balances.length,
      );

      return balancesMap;
    }),
  )
  .subscribe((balances) => {
    balancesState$.next(balances);
  });
