import type { SessionTypes } from "@walletconnect/types";
import { isEqual, uniq } from "lodash";
import type { PolkadotSigner } from "polkadot-api";
import type { InjectedPolkadotAccount } from "polkadot-api/pjs-signer";
import { distinctUntilChanged, map, tap } from "rxjs";
import { logger } from "src/util";
import { normalizeAccountId } from "src/util/normalizeAccountId";
import { wcSession$ } from "./session.store";

export const wcAccounts$ = wcSession$.pipe(
	distinctUntilChanged<SessionTypes.Struct | null>(isEqual),
	map((session) => {
		if (!session?.namespaces) {
			logger.debug("[Wallet Connect] no session", { session });
			return [];
		}
		const wcAccounts = Object.values(session.namespaces).flatMap(
			(namespace) => namespace.accounts,
		);

		// grab account addresses from CAIP account formatted accounts
		const addresses = wcAccounts.map((wcAccount) => {
			const address = wcAccount.split(":")[2] as string;
			return address;
		});

		return uniq(addresses);
	}),
	map((addresses) => {
		return addresses.map(
			(address) =>
				({
					name: address,
					address: normalizeAccountId(address),
					polkadotSigner: getPolkadotSigner(address),
				}) as InjectedPolkadotAccount,
		);
	}),
	tap((accounts) => {
		logger.debug("[Wallet Connect] accounts$ updated", { accounts });
	}),
);

wcAccounts$.subscribe((accounts) => {
	logger.debug("[Wallet Connect] accounts$ updated", { accounts });
});

const getPolkadotSigner = (_address: string): PolkadotSigner => {
	// TODO
	return null as unknown as PolkadotSigner;
};
