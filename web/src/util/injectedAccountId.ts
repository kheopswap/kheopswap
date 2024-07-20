import { SS58String } from "polkadot-api";

import { isValidAddress } from "./isValidAddress";
import { logger } from "./logger";

export type InjectedAccountId = `${string}::${SS58String}`;

export const getInjectedAccountId = (
  wallet: string,
  address: SS58String,
): InjectedAccountId => {
  if (!wallet) throw new Error("Missing walletId");
  if (!isValidAddress(address)) throw new Error("Invalid address");
  return `${wallet}::${address}`;
};

export const parseInjectedAccountId = (walletAccountId: string) => {
  if (!walletAccountId) throw new Error("Invalid walletAccountId");
  const [wallet, address] = walletAccountId.split("::");
  if (!wallet) throw new Error("Missing walletId");
  if (!isValidAddress(address)) throw new Error("Invalid address");
  return { wallet, address };
};

export const getAddressFromAccountField = (
  idOrAddress: string | InjectedAccountId | null | undefined,
) => {
  try {
    if (!idOrAddress) return null;
    if (isValidAddress(idOrAddress)) return idOrAddress;
    const { address } = parseInjectedAccountId(idOrAddress);
    return address;
  } catch (err) {
    logger.error("Failed to parse id or address", { err, idOrAddress });
    return null;
  }
};
