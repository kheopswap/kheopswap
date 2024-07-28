import { SS58String } from "polkadot-api";
import {
  InjectedExtension,
  InjectedPolkadotAccount,
  connectInjectedExtension,
  getInjectedExtensions,
} from "polkadot-api/pjs-signer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  interval,
  map,
  merge,
  mergeMap,
  Observable,
  ReplaySubject,
  shareReplay,
  tap,
  timeout,
  timer,
} from "rxjs";
import { Dictionary, entries, flatMap, isEqual, keys, values } from "lodash";
import { bind } from "@react-rxjs/core";

import { useSetting } from "./useSetting";

import {
  InjectedAccountId,
  getInjectedAccountId,
  logger,
  provideContext,
} from "src/util";
import { sleep } from "src/util/sleep";
import { getSetting$ } from "src/services/settings";

export type InjectedAccount = InjectedPolkadotAccount & {
  id: InjectedAccountId;
  wallet: string;
};

const injectedExtensionIds$ = new BehaviorSubject<string[]>(
  getInjectedExtensions() ?? [],
);

injectedExtensionIds$.subscribe((ids) => {
  console.log("injectedExtensionIds$", ids);
});
// combineLatest(
//   [
//     //0, 100,
//     500, 1000,
//   ].map((duration) => timer(duration)),
// ).subscribe(() => {
//   console.log("tick", getInjectedExtensions()?.length);
//   injectedExtensionIds$.next();
// });

// setTimeout(() => {
//   injectedExtensionIds$.next(getInjectedExtensions() ?? []);
// }, 1000);

//const connectedExtensions$ = new BehaviorSubject<InjectedExtension[]>([]);

// const connectedExtensionIds = connectedExtensions$.pipe(
//   map((exts) => keys(exts)),
// );

const connectedExtensions$ = combineLatest([
  injectedExtensionIds$.pipe(distinctUntilChanged<string[]>(isEqual)),
  getSetting$("connectedExtensionIds"),
]).pipe(
  mergeMap(async ([injectedExtensions, connectedExtensionIds]) => {
    const injectedWallets = await Promise.all(
      connectedExtensionIds
        .filter((id) => injectedExtensions.includes(id))
        .map(async (name) => {
          try {
            console.log("connecting wallet %s", name);
            return await connectInjectedExtension(name);
          } catch (err) {
            console.error("Failed to connect wallet %s", name, { err });
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
            console.log("subscribing to %s", extension.name);
            // required because some wallets dont always fire subscription callbacks
            accounts[extension.name] = extension.getAccounts();
            subscriber.next({ ...accounts });

            subscriptions[extension.name] = extension.subscribe(
              (extensionAccounts) => {
                console.log(
                  "callback accounts",
                  extension.name,
                  extensionAccounts,
                );
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
  map((connectedAccounts) => {
    return entries(connectedAccounts)
      .map(([wallet, accounts]) =>
        accounts.map((account) => ({
          id: getInjectedAccountId(wallet, account.address as SS58String),
          ...account,
          wallet,
        })),
      )
      .flat() as InjectedAccount[];
  }),
  shareReplay(1),
);

// connectedAccounts$.subscribe((accounts) => {
//   console.log(
//     "connectedAccounts$",
//     entries(accounts)
//       .map(([k, v]) => [k, v.length].join(":"))
//       .join(", "),
//   );
// });

// getSetting$("connectedExtensionIds").subscribe(
//   async (connectedExtensionIds) => {

//   },
// );

const [useConnectedExtensions] = bind(connectedExtensions$);
const [useConnectedAccounts] = bind(accounts$);
// tap((extensions) => {
//   for (const [name, extension] of entries(extensions)) {
//     extension.subscribe((accounts) => {
//       accountsByWallet[name] = accounts;
//       subscriber.next(values(accountsByWallet).flat());
//     });
//   }
// }),
//);

// return () => {
//   unsubs.forEach((unsub) => unsub());
// };

// combineLatest([connectedExtensions$, connectedAccounts2$]).subscribe(
//   ([extensions, accounts]) => {
//     console.log(
//       "WOOT extensions:%d accounts:%d",
//       keys(extensions).length,
//       accounts.length,
//     );
//   },
// );

// connectedAccounts$.subscribe((accounts) => {
//   console.log("connectedExtensions$.valueconnectedAccounts$", accounts, connectedExtensions$.value);
// });

// const injectedAccounts = connectedExtensions$.pipe(
//   map((extensions) =>
//     extensions.map((extension) => ({
//       wallet: extension.name,
//       accounts: extension.getAccounts(),
//     })),
//   ),
// );

const useWalletsProvider = () => {
  const [connectedExtensionIds, setConnectedExtensionIds] = useSetting(
    "connectedExtensionIds",
  );
  const connectedExtensions = useConnectedExtensions();
  useEffect(() => {
    console.log("connectedExtensions changed", connectedExtensions);
  }, [connectedExtensions]);
  // const [connectedExtensions, setConnectedExtensions] = useState<
  //   InjectedExtension[]
  // >([]);
  const accounts = useConnectedAccounts();
  useEffect(() => {
    console.log("connectedAccounts changed", accounts);
  }, [accounts]);

  // const [connectedAccounts, setConnectedAccounts] = useState<
  //   Record<string, InjectedPolkadotAccount[]>
  // >({});

  // flag indicating if auto connect is finished (or failed/timeout)
  // const [isReady, setIsReady] = useState(!connectedExtensionIds.length);

  const connect = useCallback(
    async (name: string) => {
      try {
        // logger.log("attempting to connect %s", name);
        // const injected = await connectInjectedExtension(name);

        // connectedExtensions$.next({
        //   ...connectedExtensions$.value,
        //   [name]: injected,
        // });
        // setConnectedExtensions((prev) =>
        //   prev.some((ext) => ext.name === name) ? prev : [...prev, injected],
        // );
        setConnectedExtensionIds((prev) => [
          ...prev.filter((n) => n !== name),
          name,
        ]);
      } catch (err) {
        console.error("Failed to connect wallet %s", name, { err });
        throw err;
      }
    },
    [setConnectedExtensionIds],
  );

  const disconnect = useCallback(
    async (name: string) => {
      try {
        logger.log("attempting to disconnect %s", name);
        // setConnectedExtensions((prev) =>
        //   prev.filter((ext) => ext.name !== name),
        // );
        setConnectedExtensionIds((prev) => prev.filter((n) => n !== name));
        // setConnectedAccounts((prev) =>
        //   Object.fromEntries(
        //     Object.entries(prev).filter(([wallet]) => wallet !== name),
        //   ),
        // );
      } catch (err) {
        console.error("Failed to connect wallet %s", name, { err });
        throw err;
      }
    },
    [setConnectedExtensionIds],
  );

  // const refInitialized = useRef(false);

  // const accounts = useMemo<InjectedAccount[]>(() => {
  //   return Object.entries(connectedAccounts)
  //     .map(([wallet, accounts]) =>
  //       accounts.map((account) => ({
  //         id: getInjectedAccountId(wallet, account.address as SS58String),
  //         ...account,
  //         wallet,
  //       })),
  //     )
  //     .flat();
  // }, [connectedAccounts]);

  // console.log("accounts", accounts);

  // useEffect(() => {
  //   let connected = 0;

  //   const unsubs = connectedExtensions.map((extension) =>
  //     extension.subscribe((accounts) => {
  //       setConnectedAccounts((prev) => ({
  //         ...prev,
  //         [extension.name]: accounts,
  //       }));
  //       connected++;
  //       if (connected === connectedExtensionIds.length) setIsReady(true);
  //     }),
  //   );

  //   return () => {
  //     unsubs.map((unsub) => unsub());
  //   };
  // }, [connectedExtensionIds.length, connectedExtensions]);

  // auto connect, only once
  // useEffect(() => {
  //   if (refInitialized.current) return;
  //   refInitialized.current = true;

  //   const injectedExtensionIds = getInjectedExtensions() ?? [];
  //   console.log(
  //     "injectedExtensions",
  //     connectedExtensionIds,
  //     connectedExtensions,
  //   );

  //   //const extensionsToConnectIds = injectedExtensionIds.filter((name) => connectedExtensionIds.includes(name));

  //   //connectedExtensions$.next(connectedExtensionIds.map((name) => ({ name })));

  //   for (const wallet of connectedExtensionIds) {
  //     if (
  //       injectedExtensionIds?.includes(wallet) && // if injected
  //       !connectedExtensions.some((ext) => ext.name === wallet) // and not connected yet
  //     ) {
  //       logger.log("attempting to connect %s", wallet);
  //       connect(wallet).catch((err) => {
  //         console.error("Failed to reconnect %s", wallet, { err });
  //         return;
  //       });
  //     }
  //   }
  // }, [connect, connectedExtensionIds, connectedExtensions]);

  // useEffect(() => {
  //   // timeout in case an extension is meant to be connected, but has been disabled by the user, or if user disconnected all accounts from it
  //   // this flag is only used to prevent flickering on page refreshes, for screens that sort items based on connected wallets
  //   // => no need to suspense the app for this
  //   sleep(500).then(() => setIsReady(true));
  // }, []);

  // console.log({ connectedExtensions });

  return {
    connectedExtensions,
    connect,
    disconnect,
    accounts,
    // isReady,
  };
};

export const [WalletsProvider, useWallets] = provideContext(useWalletsProvider);
