import { InjectedAccount } from "polkadot-api/dist/reexports/pjs-signer";
import { useMemo } from "react";

import { Token, TokenId } from "src/config/tokens";
import { useBalances, useStablePlancksMulti } from "src/hooks";
import { BalanceDef } from "src/services/balances";

type UseuseAccountBalancesWithStablesProps = {
  tokens: Token[] | TokenId[] | null | undefined;
  accounts: InjectedAccount[] | string[] | null | undefined;
};

export type BalanceWithStable = {
  tokenId: string;
  tokenPlancks: bigint | null;
  isLoadingTokenPlancks: boolean;
  stablePlancks: bigint | null;
  isLoadingStablePlancks: boolean;
};

export type AccountBalanceWithStable = {
  address: string;
} & BalanceWithStable;

export const useBalancesWithStables = ({
  tokens,
  accounts,
}: UseuseAccountBalancesWithStablesProps) => {
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

  const { data: stables, isLoading: isLoadingStables } = useStablePlancksMulti({
    inputs: rawBalances.map(({ tokenId, balance }) => ({
      tokenId,
      plancks: balance,
    })),
  });

  const data = useMemo<AccountBalanceWithStable[]>(
    () =>
      rawBalances.map(({ address, tokenId, balance, isLoading }, idx) => ({
        address,
        tokenId,
        tokenPlancks: balance ?? null,
        isLoadingTokenPlancks: isLoading,
        ...stables[idx],
      })),
    [rawBalances, stables],
  );

  return { data, isLoading: isLoadingBalances || isLoadingStables };
};
