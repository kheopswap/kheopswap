import type { InjectedAccount } from "polkadot-api/pjs-signer";
import { useMemo } from "react";

import type { Token, TokenId } from "@kheopswap/registry";
import type { BalanceDef } from "@kheopswap/services/balances";
import { useBalances, useStablePlancksMulti } from "src/hooks";
import type { AccountBalanceWithStable } from "src/types";

type UseAccountBalancesWithStablesProps = {
	tokens: Token[] | TokenId[] | null | undefined;
	accounts: InjectedAccount[] | string[] | null | undefined;
};

export const useBalancesWithStables = ({
	tokens,
	accounts,
}: UseAccountBalancesWithStablesProps) => {
	const balanceDefs: BalanceDef[] = useMemo(() => {
		return (tokens ?? []).flatMap((token) =>
			(accounts ?? []).map((acc) => ({
				address: typeof acc === "string" ? acc : acc.address,
				tokenId: typeof token === "string" ? token : token.id,
			})),
		);
	}, [accounts, tokens]);

	const { data: rawBalances, isLoading: isLoadingBalances } = useBalances({
		balanceDefs,
	});

	const inputs = useMemo(
		() =>
			rawBalances.map(({ tokenId, balance }) => ({
				tokenId,
				plancks: balance,
			})),
		[rawBalances],
	);

	const { data: stables, isLoading: isLoadingStables } = useStablePlancksMulti({
		inputs,
	});

	const data = useMemo<AccountBalanceWithStable[]>(
		() =>
			rawBalances.map(({ address, tokenId, balance, isLoading }, idx) => ({
				address,
				tokenId,
				tokenPlancks: balance ?? null,
				isLoadingTokenPlancks: isLoading,
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				// biome-ignore lint/suspicious/noExtraNonNullAssertion: <explanation>
				...stables[idx]!,
			})),
		[rawBalances, stables],
	);

	return { data, isLoading: isLoadingBalances || isLoadingStables };
};
