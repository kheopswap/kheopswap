import {
	type BalanceDef,
	type BalanceSubscriptionMode,
	getBalances$,
} from "@kheopswap/services/balances";
import { bind } from "@react-rxjs/core";
import { map } from "rxjs";
import type { LoadingState } from "src/types";

type UseBalancesProps = {
	balanceDefs: BalanceDef[] | undefined;
	/** Subscription mode: "live" for real-time updates, "poll" for periodic updates (default: "live") */
	mode?: BalanceSubscriptionMode;
};

export type BalanceState = BalanceDef & {
	balance: bigint | undefined;
	isLoading: boolean;
};

type UseBalancesResult = LoadingState<BalanceState[]>;

// Parse balanceDefs from serialized key (includes mode)
const parseBalanceDefsKey = (
	key: string,
): { balanceDefs: BalanceDef[]; mode: BalanceSubscriptionMode } => {
	if (!key) return { balanceDefs: [], mode: "live" };
	const [mode, ...rest] = key.split(":::") as [
		BalanceSubscriptionMode,
		...string[],
	];
	const defsStr = rest.join(":::");
	if (!defsStr) return { balanceDefs: [], mode };
	const balanceDefs = defsStr.split(",,").map((item) => {
		const [address, tokenId] = item.split("||");
		return { address, tokenId, mode } as BalanceDef;
	});
	return { balanceDefs, mode };
};

// bind() only receives the serialized key
const [useBalancesInternal] = bind(
	(balanceDefsKey: string) => {
		const { balanceDefs, mode } = parseBalanceDefsKey(balanceDefsKey);
		return getBalances$(balanceDefs).pipe(
			map((balances) => ({
				data: balanceDefs.map((bd, i) => {
					const bs = balances[i];
					return {
						address: bd.address,
						tokenId: bd.tokenId,
						mode,
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
		const { balanceDefs, mode } = parseBalanceDefsKey(balanceDefsKey);
		return {
			data: balanceDefs.map((bs) => ({
				address: bs.address,
				tokenId: bs.tokenId,
				mode,
				balance: undefined,
				isLoading: !!balanceDefs.length,
			})),
			isLoading: !!balanceDefs.length,
		};
	},
);

export const useBalances = ({
	balanceDefs = [],
	mode = "live",
}: UseBalancesProps): UseBalancesResult => {
	// Serialize balanceDefs for stable caching key (use || and ,, as separators since tokenIds contain ::)
	// Include mode in key so different modes have separate subscriptions
	const balanceDefsKey = `${mode}:::${balanceDefs
		.map((bd) => `${bd.address}||${bd.tokenId}`)
		.join(",,")}`;
	return useBalancesInternal(balanceDefsKey);
};
