import { Address, BalanceDef, BalanceId } from "./types";

import { TokenId } from "src/config/tokens";

export const parseBalanceId = (balanceId: BalanceId): BalanceDef => {
  const [address, tokenId] = balanceId.split("||") as [Address, TokenId];
  return { address, tokenId };
};

export const getBalanceId = ({ address, tokenId }: BalanceDef): BalanceId =>
  `${address}||${tokenId}`;
