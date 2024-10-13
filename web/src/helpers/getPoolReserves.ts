import type { Token } from "@kheopswap/registry";
import type { Pool } from "@kheopswap/services/pools";
import type { BalanceState } from "src/hooks";

export const getPoolReserves = (
	pools: Pool[] | null | undefined,
	allReservesBalances: BalanceState[] | null | undefined,
	token1: Token | null | undefined,
	token2: Token | null | undefined,
) => {
	if (!pools || !allReservesBalances || !token1 || !token2) return null;

	if (token1.id === token2.id) return [1n, 1n] as [bigint, bigint];

	const poolNativeToStable = pools?.find(
		(pool) =>
			pool.tokenIds.includes(token1.id) &&
			pool.tokenIds.includes(token2.id) &&
			pool.tokenIds.length === 2,
	);
	const reserveNative = allReservesBalances?.find(
		(balance) =>
			balance.address === poolNativeToStable?.owner &&
			balance.tokenId === token1.id,
	);
	const reserveStable = allReservesBalances?.find(
		(balance) =>
			balance.address === poolNativeToStable?.owner &&
			balance.tokenId === token2.id,
	);
	return reserveNative?.balance && reserveStable?.balance
		? ([reserveNative.balance, reserveStable.balance] as [bigint, bigint])
		: null;
};
