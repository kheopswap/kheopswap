import { bind } from "@react-rxjs/core";
import { type Dictionary, entries, fromPairs, isEqual } from "lodash";
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

import { getSetting$, setSetting } from "@kheopswap/settings";
import {
	type InjectedAccountId,
	getInjectedAccountId,
	isValidAddress,
	logger,
	sortWallets,
} from "@kheopswap/utils";
import { WALLET_CONNECT_NAME } from "src/features/connect/wallet-connect";
import { wcAccounts$ } from "src/features/connect/wallet-connect/accounts.state";

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
						return connected ?? null;
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

const getExtensionAccounts$ = (extension: InjectedExtension) =>
	new Observable<InjectedPolkadotAccount[]>((subscriber) => {
		const accounts = extension.getAccounts();
		subscriber.next(accounts);
		return extension.subscribe((newAccounts) => {
			subscriber.next(newAccounts);
		});
	});

const accountsByExtension$ = connectedExtensions$.pipe(
	mergeMap((extensions) => {
		if (!extensions.length)
			return of({} as Dictionary<InjectedPolkadotAccount[] | undefined>);

		return combineLatest(
			extensions.map((extension) => getExtensionAccounts$(extension)),
		).pipe(
			map((arExtensionAccounts) =>
				fromPairs(
					extensions.map((ext, i) => [ext.name, arExtensionAccounts[i]]),
				),
			),
		);
	}),
);

const accounts$ = combineLatest([accountsByExtension$, wcAccounts$]).pipe(
	map(([accountsByExtension, wcAccounts]) => ({
		...accountsByExtension,
		[WALLET_CONNECT_NAME]: wcAccounts,
	})),
	map(
		(connectedAccounts) =>
			entries(connectedAccounts).flatMap(([wallet, accounts]) =>
				accounts
					.filter((account) => isValidAddress(account.address))
					.map((account) => ({
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
