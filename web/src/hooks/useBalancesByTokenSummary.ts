import { groupBy, keys } from "lodash";
import { InjectedAccount } from "polkadot-api/dist/reexports/pjs-signer";
import { useMemo } from "react";

import { useBalancesWithStables } from "./useBalancesWithStables";

import { Token, TokenId } from "src/config/tokens";

type UseBalancesByTokenSummaryProps = {
  tokens: Token[] | TokenId[] | null | undefined;
  accounts: InjectedAccount[] | string[] | null | undefined;
};

export type BalanceWithStableSummary = {
  tokenId: string;
  tokenPlancks: bigint | null;
  isLoadingTokenPlancks: boolean;
  stablePlancks: bigint | null;
  isLoadingStablePlancks: boolean;
  isInitializing: boolean;
};

export const useBalancesByTokenSummary = ({
  tokens,
  accounts,
}: UseBalancesByTokenSummaryProps) => {
  const { data: balances, isLoading } = useBalancesWithStables({
    tokens,
    accounts,
  });

  const data = useMemo<Record<TokenId, BalanceWithStableSummary>>(() => {
    const balancesByTokenId = groupBy(balances, "tokenId");

    return keys(balancesByTokenId).reduce(
      (acc, tokenId) => {
        const tokenBalances = balancesByTokenId[tokenId];
        const tokenPlancks = tokenBalances.reduce(
          (acc, { tokenPlancks }) => acc + (tokenPlancks ?? 0n),
          0n,
        );
        const isLoadingTokenPlancks = tokenBalances.some(
          (b) => b.isLoadingTokenPlancks,
        );
        const stablePlancks = tokenBalances.reduce(
          (acc, { stablePlancks }) => acc + (stablePlancks ?? 0n),
          0n,
        );
        const isLoadingStablePlancks = tokenBalances.some(
          (b) => b.isLoadingStablePlancks,
        );
        const isInitializing =
          tokenPlancks === 0n &&
          tokenBalances.some((b) => b.tokenPlancks === null);

        acc[tokenId] = {
          tokenId,
          tokenPlancks,
          isLoadingTokenPlancks,
          stablePlancks,
          isLoadingStablePlancks,
          isInitializing,
        };
        return acc;
      },
      {} as Record<TokenId, BalanceWithStableSummary>,
    );
  }, [balances]);

  return { data, isLoading };
};
