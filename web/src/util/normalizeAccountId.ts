import { AccountId, type SS58String } from "polkadot-api";

const codec = AccountId();

export const normalizeAccountId = (accountId: SS58String) =>
	codec.dec(codec.enc(accountId));
