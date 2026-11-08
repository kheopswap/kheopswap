import type { TokenId } from "../../registry/tokens/types";
import type { Address, BalanceDef, BalanceId, SpendableBalance } from "./types";

export const parseBalanceId = (balanceId: BalanceId): BalanceDef => {
	const [address, tokenId] = balanceId.split("||") as [Address, TokenId];
	return { address, tokenId };
};

export const getBalanceId = ({ address, tokenId }: BalanceDef): BalanceId =>
	`${address}||${tokenId}`;

export const getSpendableBalancesByTokenId = (
	balances: (Pick<BalanceDef, "tokenId"> & Partial<SpendableBalance>)[],
): Partial<Record<TokenId, SpendableBalance | undefined>> =>
	Object.fromEntries(
		balances.map(({ tokenId, balance, frozen }) => [
			tokenId,
			balance === undefined ? undefined : { balance, frozen: frozen ?? 0n },
		]),
	);
