import { type BalanceDef, getBalances$ } from "@kheopswap/services/balances";
import { bind } from "@react-rxjs/core";
import { map } from "rxjs";
import type { LoadingState } from "src/types";

type UseBalancesProps = {
	balanceDefs: BalanceDef[] | undefined;
};

export type BalanceState = BalanceDef & {
	balance: bigint | undefined;
	isLoading: boolean;
};

type UseBalancesResult = LoadingState<BalanceState[]>;

// Parse balanceDefs from serialized key
const parseBalanceDefsKey = (key: string): BalanceDef[] => {
	if (!key) return [];
	return key.split(",,").map((item) => {
		const [address, tokenId] = item.split("||");
		return { address, tokenId } as BalanceDef;
	});
};

// bind() only receives the serialized key
const [useBalancesInternal] = bind(
	(balanceDefsKey: string) => {
		const balanceDefs = parseBalanceDefsKey(balanceDefsKey);
		return getBalances$(balanceDefs).pipe(
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
		);
	},
	// Default value factory
	(balanceDefsKey): UseBalancesResult => {
		const balanceDefs = parseBalanceDefsKey(balanceDefsKey);
		return {
			data: balanceDefs.map((bs) => ({
				address: bs.address,
				tokenId: bs.tokenId,
				balance: undefined,
				isLoading: !!balanceDefs.length,
			})),
			isLoading: !!balanceDefs.length,
		};
	},
);

export const useBalances = ({
	balanceDefs = [],
}: UseBalancesProps): UseBalancesResult => {
	// Serialize balanceDefs for stable caching key (use || and ,, as separators since tokenIds contain ::)
	const balanceDefsKey = balanceDefs
		.map((bd) => `${bd.address}||${bd.tokenId}`)
		.join(",,");
	return useBalancesInternal(balanceDefsKey);
};
