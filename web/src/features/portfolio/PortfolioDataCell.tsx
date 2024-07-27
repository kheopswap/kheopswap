import { FC } from "react";

import { Token } from "src/config/tokens";
import { cn } from "src/util";
import { Tokens } from "src/components";
import { BalanceWithStable } from "src/types";

export const TokenBalancesSummary: FC<
  BalanceWithStable & {
    className?: string;
    token: Token;
    stableToken: Token;
  }
> = ({
  token,
  stableToken,
  tokenPlancks,
  isLoadingStablePlancks,
  stablePlancks,
  isLoadingTokenPlancks,
  className,
}) => (
  <div
    className={cn(
      "flex flex-col items-end overflow-hidden text-right",
      className,
    )}
  >
    <div
      className={cn(
        "w-full truncate",
        isLoadingTokenPlancks && "animate-pulse",
      )}
    >
      <Tokens token={token} plancks={tokenPlancks ?? 0n} digits={2} />
    </div>
    <div
      className={cn(
        "w-full truncate text-sm text-neutral-500 ",
        isLoadingStablePlancks && "animate-pulse",
      )}
    >
      <Tokens token={stableToken} plancks={stablePlancks ?? 0n} digits={2} />
    </div>
  </div>
);
