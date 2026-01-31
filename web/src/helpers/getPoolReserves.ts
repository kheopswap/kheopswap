import type { Token } from "@kheopswap/registry";
import type { Pool } from "@kheopswap/services/pools";
import { logger } from "@kheopswap/utils";
import type { BalanceState } from "src/hooks";

export const getPoolReserves = (
	pools: Pool[] | null | undefined,
	allReservesBalances: BalanceState[] | null | undefined,
	token1: Token | null | undefined,
	token2: Token | null | undefined,
) => {
	const stop = logger.cumulativeTimer("getPoolReserves");

	try {
		if (!pools || !allReservesBalances || !token1 || !token2) return null;

		if (token1.id === token2.id) return [1n, 1n] as [bigint, bigint];

		const poolNativeToStable = pools?.find(
			(pool) =>
				pool.tokenIds.includes(token1.id) &&
				pool.tokenIds.includes(token2.id) &&
				pool.tokenIds.length === 2,
		);

		// get both in one scan
		const { reserveNative, reserveStable } = allReservesBalances.reduce(
			(acc, balance) => {
				if (acc.reserveNative === null || acc.reserveStable === null)
					if (balance.address === poolNativeToStable?.owner) {
						if (balance.tokenId === token1.id) {
							acc.reserveNative = balance;
						} else if (balance.tokenId === token2.id) {
							acc.reserveStable = balance;
						}
					}

				return acc;
			},
			{ reserveNative: null, reserveStable: null } as {
				reserveNative: BalanceState | null;
				reserveStable: BalanceState | null;
			},
		);

		// Check for bigint explicitly since 0n is falsy
		return typeof reserveNative?.balance === "bigint" &&
			typeof reserveStable?.balance === "bigint"
			? ([reserveNative.balance, reserveStable.balance] as [bigint, bigint])
			: null;
	} finally {
		stop();
	}
};
