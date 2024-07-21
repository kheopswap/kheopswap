import { FC, useMemo } from "react";
import { groupBy } from "lodash";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import { PortfolioProvider, usePortfolio } from "./PortfolioProvider";

import { Token } from "src/config/tokens";
import { getChainById } from "src/config/chains";
import { cn, sortBigInt } from "src/util";
import { StablePrice, Styles, TokenLogo, Tokens } from "src/components";

type BalancesByAddress = Record<
  string,
  { balance: bigint | undefined; isLoading: boolean }
>;

type TokenRowProps = {
  token: Token;
  balances: BalancesByAddress;
  total: bigint;
  isLoading: boolean;
};

const TokenRow: FC<TokenRowProps> = ({ token, balances }) => {
  const [chain, total, isLoading, showBalances] = useMemo(
    () => [
      getChainById(token.chainId),
      Object.values(balances).reduce((acc, b) => acc + (b.balance ?? 0n), 0n),
      Object.values(balances).some(({ isLoading }) => isLoading),
      !!Object.keys(balances).length,
    ],
    [balances, token.chainId],
  );

  return (
    <button
      className={cn(
        Styles.button,
        "flex items-center gap-2 rounded-md bg-primary-950/50 p-2 pl-4 pr-3 text-left",
      )}
    >
      <TokenLogo className="inline-block size-10" token={token} />
      <div className="flex grow flex-col">
        <div className="flex justify-between gap-4">
          <div className="grow truncate">{token.symbol}</div>
          {showBalances && (
            <div className={cn("shrink-0", isLoading && "animate-pulse")}>
              <Tokens token={token} plancks={total} />
            </div>
          )}
        </div>
        <div className="flex justify-between gap-4 text-xs text-neutral-500">
          <div className="grow truncate">{chain.name}</div>
          {showBalances && (
            <div className={cn("shrink-0", isLoading && "animate-pulse")}>
              <StablePrice tokenId={token.id} plancks={total} />
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

const TokenRows: FC<{ rows: TokenRowProps[] }> = ({ rows }) => {
  const [parent] = useAutoAnimate();

  return (
    <div ref={parent} className="flex flex-col gap-2">
      {rows.map(({ token, balances, isLoading, total }) => (
        <TokenRow
          key={token.id}
          token={token}
          balances={balances}
          isLoading={isLoading}
          total={total}
        />
      ))}
    </div>
  );
};

const TokensList = () => {
  const { balances, tokens } = usePortfolio();

  const tokenAndBalances = useMemo<TokenRowProps[]>(() => {
    const balancesByTokenId = groupBy(balances, "tokenId");
    return tokens
      .map<TokenRowProps>((token) => {
        const tokenBalances = balancesByTokenId[token.id] ?? [];
        const total = tokenBalances.reduce(
          (acc, { balance }) => acc + (balance ?? 0n),
          0n,
        );
        const isLoading = tokenBalances.some(({ isLoading }) => isLoading);
        const balances = tokenBalances.reduce(
          (acc, bal) => ({
            ...acc,
            [bal.address]: { balance: bal.balance, isLoading: bal.isLoading },
          }),
          {} as BalancesByAddress,
        );

        return { token, balances, total, isLoading };
      })
      .sort((a, b) => sortBigInt(a.total, b.total, true));
  }, [balances, tokens]);

  return <TokenRows rows={tokenAndBalances} />;
};

export const Portfolio = () => {
  return (
    <PortfolioProvider>
      <TokensList />
    </PortfolioProvider>
  );
};
