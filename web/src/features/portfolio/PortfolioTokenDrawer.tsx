import { FC, useEffect, useMemo, useState } from "react";

import { usePortfolio } from "./PortfolioProvider";

import {
  AccountSelectDrawer,
  Drawer,
  DrawerContainer,
  InjectedAccountIcon,
  Shimmer,
  TokenLogo,
  Tokens,
} from "src/components";
import { Token, TokenId } from "src/config/tokens";
import { useChainName, useOpenClose, useRelayChains } from "src/hooks";
import { cn, isBigInt, sortBigInt } from "src/util";
import { BalanceWithStable } from "src/types";

const sortBalances = (a: BalanceWithStable, b: BalanceWithStable) => {
  if (isBigInt(a.tokenPlancks) && isBigInt(b.tokenPlancks))
    return sortBigInt(a.tokenPlancks, b.tokenPlancks, true);
  if (a.tokenPlancks && !b.tokenPlancks) return -1;
  if (!a.tokenPlancks && b.tokenPlancks) return 1;
  return 0;
};

const Balances: FC<{ token: Token }> = ({ token }) => {
  const { stableToken } = useRelayChains();
  const { accounts, balances, isLoading } = usePortfolio();
  const { open, close, isOpen } = useOpenClose();

  const rows = useMemo(
    () =>
      accounts
        .map((account) => ({
          account,
          balance: balances.find(
            (b) => b.tokenId === token.id && b.address === account.address,
          )!,
        }))
        .filter((row) => row.balance)
        .sort((a, b) => sortBalances(a.balance, b.balance)),
    [accounts, balances, token.id],
  );

  return (
    <div>
      {rows.length ? (
        <div className="flex flex-col gap-1 text-sm">
          {rows.map(({ account, balance }) => (
            <div
              key={account.id}
              className="flex h-12 items-center gap-4 rounded bg-neutral-850 px-2"
            >
              <div className="flex grow items-center gap-2">
                <InjectedAccountIcon className="size-6" account={account} />
                <div className="grow">{account.name}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <div className="text-sm">
                  {isBigInt(balance.tokenPlancks) ? (
                    <Tokens
                      token={token}
                      plancks={balance.tokenPlancks}
                      className={cn(
                        balance.isLoadingTokenPlancks && "animate-pulse",
                      )}
                    />
                  ) : (
                    <Shimmer>
                      <Tokens token={token} plancks={0n} />
                    </Shimmer>
                  )}
                </div>

                {stableToken.id !== token.id &&
                  (isBigInt(balance.stablePlancks) ||
                    balance.isLoadingStablePlancks) && (
                    <div className="text-sm text-neutral-500">
                      {isBigInt(balance.stablePlancks) ? (
                        <Tokens
                          token={stableToken}
                          plancks={balance.stablePlancks}
                          className={cn(
                            balance.isLoadingStablePlancks && "animate-pulse",
                          )}
                          digits={2}
                        />
                      ) : (
                        <Shimmer
                          className={isLoading ? "visible" : "invisible"}
                        >
                          <Tokens token={token} plancks={0n} digits={2} />
                        </Shimmer>
                      )}
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-neutral-500">
          <button
            type="button"
            onClick={open}
            className={cn("text-neutral-300 hover:text-neutral-100")}
          >
            Connect your accounts
          </button>{" "}
          to browse your balances.
        </div>
      )}
      <AccountSelectDrawer
        title={"Connect"}
        isOpen={isOpen}
        onDismiss={close}
        ownedOnly
      />
    </div>
  );
};

const Header: FC<{
  token: Token;
}> = ({ token }) => {
  const { name: chainName } = useChainName({ chainId: token.chainId });

  return (
    <div className="flex items-center gap-2">
      <TokenLogo className="size-10" token={token} />
      <div className="grow">
        <div className="flex items-center gap-2">
          <div className="font-bold text-neutral-50">{token.symbol}</div>
          <div className="text-lg text-neutral-400">{token.name}</div>
        </div>
        <div className="w-full truncate text-sm text-neutral-400">
          {chainName}
          {token.type === "asset" ? ` - ${token.assetId}` : null}
        </div>
      </div>
    </div>
  );
};

const DrawerContent: FC<{
  token: Token;
}> = ({ token }) => {
  return (
    <div className="">
      <Header token={token} />
      <hr className="my-4 text-neutral-800" />
      <Balances token={token} />
    </div>
  );
};

export const PortfolioTokenDrawer: FC<{
  tokenId: TokenId | null;

  onDismiss: () => void;
}> = ({ tokenId, onDismiss }) => {
  const { tokens } = usePortfolio();

  const [token, setToken] = useState<Token>();

  useEffect(() => {
    setToken(tokens.find((t) => t.id === tokenId));
  }, [tokenId, tokens]);

  return (
    <Drawer anchor="right" isOpen={!!token} onDismiss={onDismiss}>
      <DrawerContainer title={"Token Details"} onClose={onDismiss}>
        {token && <DrawerContent token={token} />}
      </DrawerContainer>
    </Drawer>
  );
};
