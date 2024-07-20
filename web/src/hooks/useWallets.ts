import { SS58String } from "polkadot-api";
import {
  InjectedExtension,
  InjectedPolkadotAccount,
  connectInjectedExtension,
  getInjectedExtensions,
} from "polkadot-api/pjs-signer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSetting } from "./useSetting";

import {
  InjectedAccountId,
  getInjectedAccountId,
  logger,
  provideContext,
} from "src/util";

export type InjectedAccount = InjectedPolkadotAccount & {
  id: InjectedAccountId;
  wallet: string;
};

const useWalletsProvider = () => {
  const [connectedExtensionIds, setConnectedExtensionIds] = useSetting(
    "connectedExtensionIds",
  );
  const [connectedExtensions, setConnectedExtensions] = useState<
    InjectedExtension[]
  >([]);
  const [connectedAccounts, setConnectedAccounts] = useState<
    Record<string, InjectedPolkadotAccount[]>
  >({});

  const connect = useCallback(
    async (name: string) => {
      try {
        logger.log("attempting to connect %s", name);
        const injected = await connectInjectedExtension(name);
        setConnectedExtensions((prev) =>
          prev.some((ext) => ext.name === name) ? prev : [...prev, injected],
        );
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
        setConnectedExtensions((prev) =>
          prev.filter((ext) => ext.name !== name),
        );
        setConnectedExtensionIds((prev) => prev.filter((n) => n !== name));
        setConnectedAccounts((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(([wallet]) => wallet !== name),
          ),
        );
      } catch (err) {
        console.error("Failed to connect wallet %s", name, { err });
        throw err;
      }
    },
    [setConnectedExtensionIds],
  );

  const refInitialized = useRef(false);

  // auto connect, only once
  useEffect(() => {
    if (refInitialized.current) return;
    refInitialized.current = true;

    const injectedExtensions = getInjectedExtensions();

    for (const wallet of connectedExtensionIds) {
      if (
        injectedExtensions?.includes(wallet) && // if injected
        !connectedExtensions.some((ext) => ext.name === wallet) // and not connected yet
      ) {
        logger.log("attempting to connect %s", wallet);
        connect(wallet).catch((err) => {
          console.error("Failed to reconnect %s", wallet, { err });
          return;
        });
      }
    }
  }, [connect, connectedExtensionIds, connectedExtensions]);

  useEffect(() => {
    const unsubs = connectedExtensions.map((extension) =>
      extension.subscribe((accounts) => {
        setConnectedAccounts((prev) => ({
          ...prev,
          [extension.name]: accounts,
        }));
      }),
    );

    return () => {
      unsubs.map((unsub) => unsub());
    };
  });

  const accounts = useMemo<InjectedAccount[]>(() => {
    return Object.entries(connectedAccounts)
      .map(([wallet, accounts]) =>
        accounts.map((account) => ({
          id: getInjectedAccountId(wallet, account.address as SS58String),
          ...account,
          wallet,
        })),
      )
      .flat();
  }, [connectedAccounts]);

  return {
    connectedExtensions,
    connect,
    disconnect,
    accounts,
  };
};

export const [WalletsProvider, useWallets] = provideContext(useWalletsProvider);
