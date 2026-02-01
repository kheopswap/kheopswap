import type { TokenId } from "@kheopswap/registry";
import type { Address, BalanceId } from "./types";

export const parseBalanceId = (
	balanceId: BalanceId,
): { address: Address; tokenId: TokenId } => {
	const [address, tokenId] = balanceId.split("||") as [Address, TokenId];
	return { address, tokenId };
};

export const getBalanceId = ({
	address,
	tokenId,
}: {
	address: Address;
	tokenId: TokenId;
}): BalanceId => `${address}||${tokenId}`;
