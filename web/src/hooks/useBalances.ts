import { type BalanceDef, getBalances$ } from "@kheopswap/services/balances";
import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";

type UseBalancesProps = {
	balanceDefs: BalanceDef[] | undefined;
};

export type BalanceState = BalanceDef & {
	balance: bigint | undefined;
	isLoading: boolean;
};

type UseBalancesResult = {
	data: BalanceState[];
	isLoading: boolean;
};

export const useBalances = ({
	balanceDefs = [],
}: UseBalancesProps): UseBalancesResult => {
	const balances$ = useMemo(
		() =>
			getBalances$(balanceDefs).pipe(
				map((balances) => ({
					data: balanceDefs.map((bd, i) => {
						const bs = balances[i];
						return {
							address: bd.address,
							tokenId: bd.tokenId,
							balance: bs?.balance ?? undefined,
							isLoading: bs?.status !== "loaded",
						};
					}),
					isLoading: balances.some((b) => b.status !== "loaded"),
				})),
			),
		[balanceDefs],
	);

	const defaultBalances = useMemo(
		() => ({
			data: balanceDefs.map((bs) => ({
				address: bs.address,
				tokenId: bs.tokenId,
				balance: undefined,
				isLoading: !!balanceDefs.length,
			})),
			isLoading: !!balanceDefs.length,
		}),
		[balanceDefs],
	);

	return useObservable(balances$, defaultBalances);
};
