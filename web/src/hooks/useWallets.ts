import { SS58String } from "polkadot-api";
import {
  InjectedExtension,
  InjectedPolkadotAccount,
  connectInjectedExtension,
  getInjectedExtensions,
} from "polkadot-api/pjs-signer";
import { useCallback } from "react";
import {
  combineLatest,
  distinctUntilChanged,
  interval,
  map,
  mergeMap,
  Observable,
  shareReplay,
} from "rxjs";
import { entries, isEqual } from "lodash";
import { bind } from "@react-rxjs/core";

import { useSetting } from "./useSetting";

import {
  InjectedAccountId,
  getInjectedAccountId,
  logger,
  provideContext,
  sortWallets,
} from "src/util";
import { getSetting$ } from "src/services/settings";

export type InjectedAccount = InjectedPolkadotAccount & {
  id: InjectedAccountId;
  wallet: string;
};

const injectedExtensionIds$ = interval(1000).pipe(
  map(() => (getInjectedExtensions() ?? []).concat().sort(sortWallets)),
  distinctUntilChanged<string[]>(isEqual),
);

const connectedExtensions = new Map<string, Promise<InjectedExtension>>();

const connectedExtensions$ = combineLatest([
  injectedExtensionIds$,
  getSetting$("connectedExtensionIds"),
]).pipe(
  mergeMap(async ([injectedExtensions, connectedExtensionIds]) => {
    const injectedWallets = await Promise.all(
      connectedExtensionIds
        .filter((id) => injectedExtensions.includes(id))
        .map(async (name) => {
          try {
            if (!connectedExtensions.has(name)) {
              logger.debug("connecting wallet %s", name);
              connectedExtensions.set(name, connectInjectedExtension(name));
            }
            return (await connectedExtensions.get(name)) as InjectedExtension;
          } catch (err) {
            console.error("Failed to connect wallet %s", name, { err });
            connectedExtensions.delete(name);
            return null;
          }
        }),
    );

    return injectedWallets.filter(Boolean) as InjectedExtension[];
  }),
);

const accounts$ = new Observable<Record<string, InjectedPolkadotAccount[]>>(
  (subscriber) => {
    const accounts: Record<string, InjectedPolkadotAccount[]> = {};
    const subscriptions: Record<string, () => void> = {};

    return connectedExtensions$.subscribe((extensions) => {
      for (const extension of extensions)
        if (!subscriptions[extension.name]) {
          try {
            // required because some wallets dont always fire subscription callbacks
            accounts[extension.name] = extension.getAccounts();
            subscriber.next({ ...accounts });

            subscriptions[extension.name] = extension.subscribe(
              (extensionAccounts) => {
                accounts[extension.name] = extensionAccounts;
                subscriber.next({ ...accounts });
              },
            );
          } catch (err) {
            console.error("Failed to subscribe to %s", extension.name, { err });
          }
        }

      for (const [name, unsub] of entries(subscriptions))
        if (!extensions.some((ext) => ext.name === name)) {
          unsub();
          delete subscriptions[name];
          delete accounts[name];
          subscriber.next({ ...accounts });
        }

      // init empty if no extensions
      if (!extensions.length) subscriber.next({});
    });
  },
).pipe(
  map(
    (connectedAccounts) =>
      entries(connectedAccounts)
        .map(([wallet, accounts]) =>
          accounts.map((account) => ({
            id: getInjectedAccountId(wallet, account.address as SS58String),
            ...account,
            wallet,
          })),
        )
        .flat() as InjectedAccount[],
  ),
  shareReplay(1),
);

const [useInjectedExtensionsIds] = bind(injectedExtensionIds$);
const [useConnectedExtensions] = bind(connectedExtensions$);
const [useConnectedAccounts] = bind(accounts$);

const useWalletsProvider = () => {
  const [, setConnectedExtensionIds] = useSetting("connectedExtensionIds");

  const injectedExtensionIds = useInjectedExtensionsIds();
  const connectedExtensions = useConnectedExtensions();
  const accounts = useConnectedAccounts();

  const connect = useCallback(
    async (name: string) => {
      setConnectedExtensionIds((prev) => [
        ...prev.filter((n) => n !== name),
        name,
      ]);
    },
    [setConnectedExtensionIds],
  );

  const disconnect = useCallback(
    async (name: string) => {
      setConnectedExtensionIds((prev) => prev.filter((n) => n !== name));
    },
    [setConnectedExtensionIds],
  );

  return {
    injectedExtensionIds,
    connectedExtensions,
    connect,
    disconnect,
    accounts,
  };
};

export const [WalletsProvider, useWallets] = provideContext(useWalletsProvider);
