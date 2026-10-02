import { map } from "rxjs";
import { getBalances$ } from "../services/balances/service";
import type { BalanceDef } from "../services/balances/types";
import { bindSerialized } from "../utils/bindSerialized";

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

const useBalancesByDefs = bindSerialized(
	({ balanceDefs }: { balanceDefs: BalanceDef[] }) =>
		getBalances$(balanceDefs).pipe(
			map(
				(balances): UseBalancesResult => ({
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
				}),
			),
		),
	({ balanceDefs }): UseBalancesResult => ({
		data: balanceDefs.map((bd) => ({
			address: bd.address,
			tokenId: bd.tokenId,
			balance: undefined,
			isLoading: true,
		})),
		isLoading: !!balanceDefs.length,
	}),
);

export const useBalances = ({
	balanceDefs = [],
}: UseBalancesProps): UseBalancesResult =>
	useBalancesByDefs({
		balanceDefs: balanceDefs.map(({ address, tokenId }) => ({
			address,
			tokenId,
		})),
	});
