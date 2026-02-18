import type { TokenId } from "../../registry/tokens/types";
import type { Address, BalanceDef, BalanceId } from "./types";

export const parseBalanceId = (balanceId: BalanceId): BalanceDef => {
	const [address, tokenId] = balanceId.split("||") as [Address, TokenId];
	return { address, tokenId };
};

export const getBalanceId = ({ address, tokenId }: BalanceDef): BalanceId =>
	`${address}||${tokenId}`;
