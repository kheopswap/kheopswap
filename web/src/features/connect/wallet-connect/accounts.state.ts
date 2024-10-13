import { logger, normalizeAccountId, shortenAddress } from "@kheopswap/utils";
import type { SessionTypes } from "@walletconnect/types";
import { isEqual, uniq } from "lodash";
import type { SS58String } from "polkadot-api";
import type { InjectedPolkadotAccount } from "polkadot-api/pjs-signer";
import { distinctUntilChanged, map } from "rxjs";
import { getWcPolkadotSigner } from "./getWcPolkedotSigner";
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
			return normalizeAccountId(address);
		});

		return uniq(addresses);
	}),
	distinctUntilChanged<SS58String[]>(isEqual),
	map((addresses) => {
		logger.debug("[Wallet Connect] accounts$ updated", { addresses });
		return addresses.map(
			(address) =>
				({
					name: `WalletConnect ${shortenAddress(address, 6)}`,
					address,
					polkadotSigner: getWcPolkadotSigner(address),
				}) as InjectedPolkadotAccount,
		);
	}),
);
