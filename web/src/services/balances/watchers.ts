import { BehaviorSubject, Subscription } from "rxjs";

import { balancesStore$ } from "./store";
import { balanceSubscriptions$ } from "./subscriptions";
import { BalanceId } from "./types";
import { parseBalanceId } from "./utils";

import { getChainById } from "src/config/chains";
import { parseTokenId } from "src/config/tokens";
import { getApi, isApiAssetHub } from "src/services/api";
import { LoadingStatus } from "src/services/common";

export const balanceStatuses$ = new BehaviorSubject<
  Record<BalanceId, LoadingStatus>
>({});

const WATCHERS = new Map<BalanceId, Promise<Subscription>>();

const updateBalanceLoadingStatus = (
  balanceId: BalanceId,
  status: LoadingStatus,
) => {
  if (balanceStatuses$.value[balanceId] === status) return;

  balanceStatuses$.next({
    ...balanceStatuses$.value,
    [balanceId]: status,
  });
};

const updateBalance = (balanceId: BalanceId, balance: bigint) => {
  const { tokenId, address } = parseBalanceId(balanceId);

  const newBalances = balancesStore$.value
    .filter((b) => b.tokenId !== tokenId || b.address !== address)
    .concat({ address, tokenId, balance: balance.toString() });

  // update balances store
  balancesStore$.next(newBalances);

  // indicate it's loaded
  updateBalanceLoadingStatus(balanceId, "loaded");
};

const watchBalance = async (balanceId: BalanceId) => {
  const { tokenId, address } = parseBalanceId(balanceId);
  const token = parseTokenId(tokenId);
  const chain = getChainById(token.chainId);
  if (!chain) throw new Error("Chain not found for " + token.chainId);

  const api = await getApi(chain.id);

  updateBalanceLoadingStatus(balanceId, "loading");

  switch (token.type) {
    case "native": {
      const obsAccount = api.query.System.Account.watchValue(address, "best");

      return obsAccount.subscribe((account) => {
        const balance = account.data.free - account.data.frozen;
        updateBalance(balanceId, balance);
      });
    }
    case "asset": {
      if (!isApiAssetHub(api))
        throw new Error(
          `Cannot watch balance for ${tokenId}. Assets are not supported on ${chain.id}`,
        );

      const obsAccount = api.query.Assets.Account.watchValue(
        token.assetId,
        address,
        "best",
      );

      return obsAccount.subscribe((account) => {
        const balance =
          account?.status.type === "Liquid" ? account.balance : 0n;
        updateBalance(balanceId, balance);
      });
    }
    case "pool-asset": {
      if (!isApiAssetHub(api))
        throw new Error(
          `Cannot watch balance for ${tokenId}. PoolAssets are not supported on ${chain.id}`,
        );

      const obsAccount = api.query.PoolAssets.Account.watchValue(
        token.poolAssetId,
        address,
        "best",
      );

      return obsAccount.subscribe((account) => {
        const balance =
          account?.status.type === "Liquid" ? account.balance : 0n;
        updateBalance(balanceId, balance);
      });
    }
  }
};

// subscribe to the list of the unique balanceIds to watch
// and update watchers accordingly
balanceSubscriptions$.subscribe((balanceIds) => {
  // add missing watchers
  balanceIds.forEach((balanceId) => {
    if (WATCHERS.has(balanceId)) return;
    WATCHERS.set(balanceId, watchBalance(balanceId));
  });

  // remove watchers that are not needed anymore
  const existingIds = Array.from(WATCHERS.keys());
  const watchersToStop = existingIds.filter((id) => !balanceIds.includes(id));
  for (const balanceId of watchersToStop) {
    WATCHERS.get(balanceId)?.then((watcher) => watcher.unsubscribe());
    WATCHERS.delete(balanceId);
    balanceStatuses$.next({
      ...balanceStatuses$.value,
      [balanceId]: "stale",
    });
  }
});
