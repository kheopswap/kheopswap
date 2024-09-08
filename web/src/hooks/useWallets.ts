import { bind } from "@react-rxjs/core";
import { entries, isEqual } from "lodash";
import type { SS58String } from "polkadot-api";
import {
	type InjectedExtension,
	type InjectedPolkadotAccount,
	connectInjectedExtension,
	getInjectedExtensions,
} from "polkadot-api/pjs-signer";
import { useCallback } from "react";
import {
	BehaviorSubject,
	Observable,
	combineLatest,
	distinctUntilChanged,
	map,
	mergeMap,
	of,
	shareReplay,
	timer,
} from "rxjs";

import { useSetting } from "./useSetting";

import { WALLET_CONNECT_NAME } from "src/features/connect/wallet-connect";
import { wcAccounts$ } from "src/features/connect/wallet-connect/accounts.state";
import { getSetting$, setSetting } from "src/services/settings";
import {
	type InjectedAccountId,
	getInjectedAccountId,
	logger,
	sortWallets,
} from "src/util";

export type InjectedAccount = InjectedPolkadotAccount & {
	id: InjectedAccountId;
	wallet: string;
};

const getInjectedWalletsIds = () =>
	getInjectedExtensions()?.concat().sort(sortWallets) ?? [];

const injectedExtensionIds$ = new BehaviorSubject<string[]>(
	getInjectedWalletsIds(),
);

// poll for wallets that are slow to register
of(100, 500, 1000)
	.pipe(mergeMap((time) => timer(time)))
	.subscribe(() => {
		const ids = getInjectedWalletsIds();
		if (!isEqual(ids, injectedExtensionIds$.value))
			injectedExtensionIds$.next(ids);
	});

const connectedExtensions = new Map<string, Promise<InjectedExtension>>();

const connectedExtensions$ = combineLatest([
	injectedExtensionIds$,
	getSetting$("connectedExtensionIds"),
]).pipe(
	distinctUntilChanged<[string[], string[]]>(isEqual),
	mergeMap(async ([injectedExtensions, connectedExtensionIds]) => {
		const injectedWallets = await Promise.all(
			connectedExtensionIds
				.filter((id) => injectedExtensions.includes(id))
				.map(async (name) => {
					try {
						const stop = logger.timer(`connecting wallet ${name}`);
						if (!connectedExtensions.has(name)) {
							logger.debug("connecting wallet %s", name);
							connectedExtensions.set(name, connectInjectedExtension(name));
						}
						const connected = (await connectedExtensions.get(
							name,
						)) as InjectedExtension;
						stop();
						return connected;
					} catch (err) {
						console.error("Failed to connect wallet %s", name, { err });
						connectedExtensions.delete(name);
						setSetting(
							"connectedExtensionIds",
							connectedExtensionIds.filter((id) => id !== name),
						);
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

		return combineLatest([connectedExtensions$, wcAccounts$]).subscribe(
			([extensions, wcAccounts]) => {
				const wcAccountsMap: Record<string, InjectedPolkadotAccount[]> =
					wcAccounts.length ? { [WALLET_CONNECT_NAME]: wcAccounts } : {};

				for (const extension of extensions)
					if (!subscriptions[extension.name]) {
						try {
							// required because some wallets dont always fire subscription callbacks
							accounts[extension.name] = extension.getAccounts();
							subscriber.next({ ...accounts, ...wcAccountsMap });

							subscriptions[extension.name] = extension.subscribe(
								(extensionAccounts) => {
									accounts[extension.name] = extensionAccounts;
									subscriber.next({ ...accounts, ...wcAccountsMap });
								},
							);
						} catch (err) {
							console.error("Failed to subscribe to %s", extension.name, {
								err,
							});
						}
					}

				for (const [name, unsub] of entries(subscriptions))
					if (!extensions.some((ext) => ext.name === name)) {
						unsub();
						delete subscriptions[name];
						delete accounts[name];
						subscriber.next({ ...accounts, ...wcAccountsMap });
					}

				// init empty if no extensions
				if (!extensions.length) subscriber.next(wcAccountsMap);
			},
		);
	},
).pipe(
	map(
		(connectedAccounts) =>
			entries(connectedAccounts).flatMap(([wallet, accounts]) =>
				accounts.map((account) => ({
					id: getInjectedAccountId(wallet, account.address as SS58String),
					...account,
					wallet,
				})),
			) as InjectedAccount[],
	),
	shareReplay(1),
);

const [useInjectedExtensionsIds] = bind(injectedExtensionIds$);
const [useConnectedExtensions] = bind(connectedExtensions$);
const [useConnectedAccounts] = bind(accounts$);

export const useWallets = () => {
	const [, setConnectedExtensionIds] = useSetting("connectedExtensionIds");

	const injectedExtensionIds = useInjectedExtensionsIds();
	const connectedExtensions = useConnectedExtensions();
	const accounts = useConnectedAccounts();

	const connect = useCallback(
		(name: string) => {
			setConnectedExtensionIds((prev) => [
				...prev.filter((n) => n !== name),
				name,
			]);
		},
		[setConnectedExtensionIds],
	);

	const disconnect = useCallback(
		(name: string) => {
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
