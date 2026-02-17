import { AccountId, type SS58String } from "polkadot-api";

const codec = AccountId();

/**
 * Normalize an SS58 address by re-encoding it through the AccountId codec.
 * This converts between different SS58 prefixes to a canonical form.
 */
export const normalizeSs58AccountId = (accountId: SS58String) =>
	codec.dec(codec.enc(accountId));
