import { FC, useMemo } from "react";
import { groupBy } from "lodash";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import { PortfolioProvider, usePortfolio } from "./PortfolioProvider";

import { Token } from "src/config/tokens";
import { getChainById } from "src/config/chains";
import { cn, isBigInt, sortBigInt } from "src/util";
import { Styles, TokenLogo, Tokens } from "src/components";
import { useWallets } from "src/hooks";

type BalancesByAddress = Record<
  string,
  {
    balance: bigint | undefined;
    isLoading: boolean;
    stablePlancks: bigint | null;
    isLoadingStablePlancks: boolean;
  }
>;

type TokenRowProps = {
  token: Token;
  stableToken: Token;
  balances: BalancesByAddress;
  total: bigint;
  totalStables: bigint | null;
  isLoading: boolean;
  isLoadingStables: boolean;
};

const TokenRow: FC<TokenRowProps> = ({
  token,
  balances,
  total,
  totalStables,
  isLoading,
  isLoadingStables,
  stableToken,
}) => {
  const chain = useMemo(() => getChainById(token.chainId), [token]);
  const showBalances = useMemo(
    () => !!Object.keys(balances).length,
    [balances],
  );

  return (
    <div
      className={cn(
        Styles.button,
        "flex items-center gap-2 rounded-md bg-primary-950/50 p-2 pl-4 pr-3 text-left sm:gap-3",
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
          <div className="grow truncate">{`${chain.name}${token.type === "asset" ? ` - ${token.assetId}` : ""}`}</div>
          {!!total && showBalances && !!stableToken && (
            <div
              className={cn("shrink-0", isLoadingStables && "animate-pulse")}
            >
              {totalStables !== null && (
                <Tokens token={stableToken} plancks={totalStables} digits={2} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TokenRows: FC<{ rows: TokenRowProps[] }> = ({ rows }) => {
  const [parent] = useAutoAnimate();

  return (
    <div ref={parent} className="flex flex-col gap-2">
      {rows.map(({ token, ...props }) => (
        <TokenRow key={token.id} token={token} {...props} />
      ))}
    </div>
  );
};

const TokensList = () => {
  const { balances, tokens, stableToken } = usePortfolio();

  const tokenAndBalances = useMemo<TokenRowProps[]>(() => {
    const balancesByTokenId = groupBy(balances, "tokenId");
    return tokens
      .map<TokenRowProps>((token) => {
        const tokenBalances = balancesByTokenId[token.id] ?? [];
        const total = tokenBalances.reduce(
          (acc, { balance }) => acc + (balance ?? 0n),
          0n,
        );
        const hasStable = tokenBalances.some(
          (tb) => tb.stablePlancks !== null && tb.balance,
        );
        const totalStables = hasStable
          ? tokenBalances.reduce(
              (acc, { stablePlancks }) => acc + (stablePlancks ?? 0n),
              0n,
            )
          : null;
        const isLoading = tokenBalances.some(({ isLoading }) => isLoading);
        const isLoadingStables = tokenBalances.some(
          ({ isLoadingStablePlancks }) => isLoadingStablePlancks,
        );
        const balances = tokenBalances.reduce(
          (acc, bal) => ({
            ...acc,
            [bal.address]: {
              balance: bal.balance,
              isLoading: bal.isLoading,
              stablePlancks: bal.stablePlancks,
              isLoadingStablePlancks: bal.isLoadingStablePlancks,
            },
          }),
          {} as BalancesByAddress,
        );

        return {
          token,
          balances,
          total,
          totalStables,
          isLoading,
          isLoadingStables: isLoading || isLoadingStables,
          stableToken,
        };
      })
      .sort((a, b) => {
        if (isBigInt(a.totalStables) && isBigInt(b.totalStables))
          return sortBigInt(a.totalStables, b.totalStables, true);
        if (isBigInt(a.totalStables)) return -1;
        if (isBigInt(b.totalStables)) return 1;

        if (a.total && !b.total) return -1;
        if (!a.total && b.total) return 1;
        return 0;
      });
  }, [balances, stableToken, tokens]);

  return <TokenRows rows={tokenAndBalances} />;
};

export const Portfolio = () => {
  const { isReady } = useWallets();

  if (!isReady) return null;

  return (
    <PortfolioProvider>
      <TokensList />
    </PortfolioProvider>
  );
};
